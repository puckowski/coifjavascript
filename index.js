var selectedImage1 = null;
var selectedImage2 = null;
var limitToBestMatches = false;

// Toggle function for the checkbox
document.getElementById('limitBestMatches').addEventListener('change', function () {
    limitToBestMatches = this.checked;
    console.log("Limit to Best Matches: ", limitToBestMatches);
});

// CircleResult.js
class CircleResult {
    constructor(hist, innerHist, centerHist) {
        this.hist = hist;
        this.innerHist = innerHist;
        this.centerHist = centerHist;
    }

    getHist() {
        return this.hist;
    }

    getInnerHist() {
        return this.innerHist;
    }

    getCenterHist() {
        return this.centerHist;
    }
}

// FeatureMatch.js
class FeatureMatch {
    constructor(x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.roughBinDistance = 0;
        this.rotationArrayIndex = 0;
    }

    getX1() {
        return this.x1;
    }

    getY1() {
        return this.y1;
    }

    getX2() {
        return this.x2;
    }

    getY2() {
        return this.y2;
    }

    getRoughDistance() {
        return this.roughBinDistance;
    }

    setRoughBinDistance(distance) {
        this.roughBinDistance = distance;
    }
}

// HistResult.js
class HistResult {
    constructor(hist, innerHist, x, y, centerHist) {
        this.hist = hist;
        this.innerHist = innerHist;
        this.centerHist = centerHist;
        this.x = x;
        this.y = y;
        this.distinctiveness = 0;
        this.minDistinctiveness = 0;
        this.maxDistinctiveness = 0;
        this.longestSequence = 0;
    }

    getX() {
        return this.x;
    }

    getY() {
        return this.y;
    }

    getHist() {
        return this.hist;
    }

    getInnerHist() {
        return this.innerHist;
    }

    getCenterHist() {
        return this.centerHist;
    }

    getDistances() {
        return this.distances;
    }

    getDistances2() {
        return this.distances2;
    }

    computeDistinctiveness(modifier) {
        let score = 0;
        for (let n = 0; n < this.hist.length; ++n) {
            if (this.hist[n] < modifier) score++;
        }

        this.distinctiveness = 256 - score;
        this.minDistinctiveness = this.distinctiveness - 10;
        this.maxDistinctiveness = this.distinctiveness + 10;

        let longestSequence = 0;
        let count = 0;
        for (let n = 0; n < this.hist.length; ++n) {
            if (this.hist[n] < 25) {
                count++;
            } else {
                if (longestSequence < count) {
                    longestSequence = count;
                }
                count = 0;
            }
        }

        this.longestSequence = longestSequence;
    }

    computeDistances(mergeBinCount) {
        const histLength = 256 / mergeBinCount;

        this.distances = new Array(Math.floor(histLength));

        let sum1 = 0;
        let sum2 = 0;
        let binIndex = 0;
        let angleIndex = 0;

        for (let i = 0; i < 256; ++i) {
            sum1 += this.hist[i];
            sum2 += this.innerHist[i];
            binIndex++;

            if (binIndex === mergeBinCount) {
                this.distances[angleIndex] = sum1 - sum2;
                angleIndex++;
                binIndex = 0;
            }
        }

        this.distances2 = new Array(Math.floor(histLength));

        sum1 = 0;
        sum2 = 0;
        binIndex = 0;
        angleIndex = 0;

        for (let i = 0; i < 256; ++i) {
            sum1 += this.innerHist[i];
            sum2 += this.centerHist[i];
            binIndex++;

            if (binIndex === mergeBinCount) {
                this.distances2[angleIndex] = sum1 - sum2;
                angleIndex++;
                binIndex = 0;
            }
        }
    }
}

// HistResultList.js
class HistResultList {
    constructor() {
        this.histResults = [];
        this.distinctivenessAverage = 0;
    }

    distinctivenessLessThan(threshold) {
        let sum = 0.0;
        for (let h of this.histResults) {
            sum += h.distinctiveness;
        }
        sum /= this.histResults.length;

        return sum < threshold;
    }

    distinctivenessGreaterThan(threshold) {
        for (let h of this.histResults) {
            if (h.distinctiveness > threshold) {
                return true;
            }
        }

        return false;
    }
}

// ImageUtils.js
class ImageUtils {
    constructor() { }

    /*
    loadImage(url) {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'Anonymous'; // Handle CORS if the image is from another domain
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                    img.src = url;
                });
            }*/

    markupGrayscaleWithResults(grayValues, results) {
        if (grayValues.length === 0) {
            return null;
        }

        const newImage = document.createElement('canvas');
        newImage.width = grayValues.length;
        newImage.height = grayValues[0].length;
        const ctx = newImage.getContext('2d');

        // Generate a random color
        const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;

        // Set the stroke and fill styles to the random color
        ctx.strokeStyle = randomColor;
        ctx.fillStyle = randomColor;

        for (let x = 0; x < grayValues.length; ++x) {
            for (let y = 0; y < grayValues[x].length; ++y) {
                const value = grayValues[x][y];
                ctx.fillRect(x, y, 1, 1);
            }
        }

        for (let result of results) {
            ctx.beginPath();
            ctx.arc(result.getX(), result.getY(), 3, 0, 2 * Math.PI);
            ctx.fill();
        }

        return newImage;
    }

    resize(img, newW, newH) {
        const newImage = document.createElement('canvas');
        newImage.width = newW;
        newImage.height = newH;
        const ctx = newImage.getContext('2d');
        ctx.drawImage(img, 0, 0, newW, newH);
        return newImage;
    }

    async localGrayscaleArray(img) {
        const imgForResize = await loadImage(img);
        const canvas = this.resize(imgForResize, 640, 480); // Assuming resizing to 640 width
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const grayValues = Array.from({ length: canvas.width }, () => new Array(canvas.height));

        for (let x = 0; x < canvas.width; x++) {
            for (let y = 0; y < canvas.height; y++) {
                const index = (y * canvas.width + x) * 4;
                const red = imgData.data[index];
                const green = imgData.data[index + 1];
                const blue = imgData.data[index + 2];
                const gray = Math.round(red * 0.299 + green * 0.587 + blue * 0.114);
                grayValues[x][y] = gray;
            }
        }

        return grayValues;
    }
}

// LocalMaximumList.js
class LocalMaximumList {
    constructor(startX, startY, finalX, finalY, localFeatureCount) {
        this.startX = startX;
        this.startY = startY;
        this.finalX = finalX;
        this.finalY = finalY;
        this.localFeatureCount = localFeatureCount;
        this.results = new PriorityQueue((a, b) => a.minSsd - b.minSsd, localFeatureCount + 1);
    }

    containsPoint(x, y) {
        return x >= this.startX && x <= this.finalX && y >= this.startY && y <= this.finalY;
    }

    getResults() {
        return this.results.toArray();
    }

    addResult(result) {
        this.results.enqueue(result);
        if (this.results.size() > this.localFeatureCount) {
            this.results.dequeue();
        }
    }

    toString() {
        return `(${this.startX}, ${this.startY}) (${this.finalX}, ${this.finalY})`;
    }
}

// PriorityQueue.js
class PriorityQueue {
    constructor(compareFunction, maxSize) {
        this.queue = [];
        this.compare = compareFunction;
        this.maxSize = maxSize;
    }

    enqueue(element) {
        this.queue.push(element);
        this.queue.sort(this.compare);
        if (this.maxSize && this.queue.length > this.maxSize) {
            this.queue.pop();
        }
    }

    dequeue() {
        return this.queue.shift();
    }

    size() {
        return this.queue.length;
    }

    toArray() {
        return this.queue.slice();
    }
}

async function performCircles2(image, radius, results, binMergeCount) {
    const resultList = [];
    const width = image.length;
    const height = image[0].length;

    for (let mr of results) {
        let x = mr.x;
        let y = mr.y;

        if (x - 4 >= 0 && y - 4 >= 0 && x + 4 < width && y + 4 < height) {
            const cr = circles3(image, x, y - 4, radius);
            const hist = cr.getHist();
            const hist2 = cr.getInnerHist();
            const center = cr.getCenterHist();

            const hr = new HistResult(hist, hist2, x, y - 4, center);
            hr.computeDistances(binMergeCount);
            hr.computeDistinctiveness(2);

            const crSec = circles3(image, x - 4, y, radius);
            const hrSec = new HistResult(crSec.getHist(), crSec.getInnerHist(), x - 4, y, crSec.getCenterHist());
            hrSec.computeDistances(binMergeCount);
            hrSec.computeDistinctiveness(2);

            const crThird = circles3(image, x + 4, y, radius);
            const hrThird = new HistResult(crThird.getHist(), crThird.getInnerHist(), x + 4, y, crThird.getCenterHist());
            hrThird.computeDistances(binMergeCount);
            hrThird.computeDistinctiveness(2);

            const crFourth = circles3(image, x, y + 4, radius);
            const hrFth = new HistResult(crFourth.getHist(), crFourth.getInnerHist(), x, y + 4, crFourth.getCenterHist());
            hrFth.computeDistances(binMergeCount);
            hrFth.computeDistinctiveness(2);

            const histResultList = new HistResultList();
            histResultList.histResults.push(hr);
            histResultList.histResults.push(hrSec);
            histResultList.histResults.push(hrThird);
            histResultList.histResults.push(hrFth);

            resultList.push(histResultList);
        }
    }

    return resultList;
}

function circles3(image, circleX, circleY, radius) {
    const width = image.length;
    const height = image[0].length;
    const radiusSquared = radius * radius;
    const radiusSquaredHalf = radiusSquared / 3;
    const radiusSquaredHalf2 = radiusSquared / 7;

    const hist = Array(256).fill(0);
    const hist2 = Array(256).fill(0);
    const hist3 = Array(256).fill(0);

    for (let x = circleX - radius - 3; x < circleX + radius + 3; x++) {
        if (x < 0 || x >= width) continue;

        for (let y = circleY - radius - 3; y < circleY + radius + 3; y++) {
            if (y < 0 || y >= height) continue;

            const dx = x - circleX;
            const dy = y - circleY;
            const distanceSquared = dx * dx + dy * dy;

            if (distanceSquared <= radiusSquared) {
                const val = image[x][y];
                hist[val]++;

                if (distanceSquared <= radiusSquaredHalf) {
                    hist2[val]++;
                    if (distanceSquared <= radiusSquaredHalf2) {
                        hist3[val]++;
                    }
                }
            }
        }
    }

    return new CircleResult(hist, hist2, hist3);
}

async function process(fileIndex) {
    const eleSpinner = document.querySelector('.loader');
    eleSpinner.style = '';

    if (!selectedImage1 && !selectedImage2) {
        selectedImage1 = '1Hill.JPG';
        selectedImage2 = '2Hill.JPG';
    }

    console.log("Moravec step...");
    const thresholdmor = 100;
    const ptsmor = 40;

    const moravecProcessor = new MoravecProcessor(thresholdmor, ptsmor, 0.02);
    const moravecProcessor2 = new MoravecProcessor(thresholdmor, ptsmor, 0.02);

    let morResults, morResults2;

    try {
        await moravecProcessor.process(selectedImage1);
        await moravecProcessor2.process(selectedImage2);

        await moravecProcessor.process2();
        await moravecProcessor2.process2();

        morResults = moravecProcessor.getResults();
        morResults2 = moravecProcessor2.getResults();
    } catch (ioException) {
        console.error("Failed to process image.", ioException);
        return;
    }

    const image = moravecProcessor.getGrayscaleData();
    const image2 = moravecProcessor2.getGrayscaleData();

    console.log("Moravec step done.");

    const width = image.length;
    const height = image[0].length;
    const width2 = image2.length;
    const height2 = image2[0].length;

    let pixelCount = width * height + width2 * height2;

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            image[x][y] = Math.ceil(image[x][y] * 0.5);
        }
    }

    for (let x = 0; x < width2; x++) {
        for (let y = 0; y < height2; y++) {
            image2[x][y] = Math.ceil(image2[x][y] * 0.5);
        }
    }

    console.log("Misc drawing step...");

    const newImage3 = document.createElement('canvas');
    newImage3.width = width + width2;
    newImage3.height = height;
    const ctx = newImage3.getContext('2d');

    for (let x = 0; x < width + width2; x++) {
        for (let y = 0; y < height; y++) {
            let colorValue;
            if (x < width) {
                colorValue = image[x][y];
            } else {
                colorValue = image2[x - width][y];
            }
            ctx.fillStyle = `rgb(${colorValue}, ${colorValue}, ${colorValue})`;
            ctx.fillRect(x, y, 1, 1);
        }
    }

    console.log("Misc drawing done.");
    const startTime = Date.now();

    let featureMatches = [];
    let binThreshold2Negation;
    let matchingIndex;
    let distancesFirst;
    let distancesSecond;
    let dist21;
    let dist22;
    let binDistance;
    let circleSize = 30;
    let mod;
    let count;
    let sum, sumOneHr, high, quart;
    let val, val2;
    let i;
    const compareIndexArray = [[0, 1, 2, 3], [1, 2, 3, 0], [2, 3, 0, 1], [3, 0, 1, 2]];
    let lowestDistance, compareIndex, compareIndexMatch, distanceFinal, hri;
    let result1, result2;
    const rotationIndexMap = new Map();
    let maxKey, maxValue;
    let list1;

    let binThreshold = 38;
    let binMergeCount = 1;
    let binThreshold2 = 57;

    do {
        binMergeCount = 1;
        binThreshold += 2;
        binThreshold2 += 3;
        binThreshold2Negation = binThreshold2 * 0.85;

        do {
            matchingIndex = 0;
            console.log("Circles step...");

            if (binMergeCount > 5) {
                break;
            }

            featureMatches = [];

            console.log("Bin merge count: " + binMergeCount);

            const hrlist = await performCircles2(image, circleSize, morResults, binMergeCount);
            const hrlist2 = await performCircles2(image2, circleSize, morResults2, binMergeCount);

            binMergeCount++;

            console.log("Circles step done.");
            console.log("Feature matching step...");

            mod = 0.35;

            do {
                mod -= 0.05;
                sum = 0.0;
                count = 0;

                for (i = 0; i < hrlist.length; i++) {
                    const hr = hrlist[i];
                    sumOneHr = 0.0;

                    for (let h of hr.histResults) {
                        sum += h.mDistinctiveness;
                        sumOneHr += h.mDistinctiveness;
                        count++;
                    }

                    hr.distinctivenessAverage = sumOneHr / 4;
                }

                sum /= count;
                quart = sum * mod;
                high = sum + quart;
                count = 0;

                for (i = 0; i < hrlist.length; i++) {
                    const hr = hrlist[i];

                    if (hr.distinctivenessAverage < high) {
                        count++;
                    }
                }
            } while (hrlist.length - count < 2500 && hrlist.length > 2500);

            for (i = 0; i < hrlist.length; i++) {
                const hr = hrlist[i];

                if (hr.distinctivenessAverage < high) {
                    hrlist.splice(i, 1);
                    i--;
                }
            }

            mod = 0.35;

            do {
                mod -= 0.05;
                sum = 0.0;
                count = 0;

                for (i = 0; i < hrlist2.length; i++) {
                    const hr = hrlist2[i];
                    sumOneHr = 0.0;

                    for (let h of hr.histResults) {
                        sum += h.mDistinctiveness;
                        sumOneHr += h.mDistinctiveness;
                        count++;
                    }

                    hr.distinctivenessAverage = sumOneHr / 4;
                }

                sum /= count;
                quart = sum * mod;
                high = sum + quart;
                count = 0;

                for (i = 0; i < hrlist2.length; i++) {
                    const hr = hrlist2[i];

                    if (hr.distinctivenessAverage < high) {
                        count++;
                    }
                }
            } while (hrlist2.length - count < 2500 && hrlist2.length > 2500);

            for (i = 0; i < hrlist2.length; i++) {
                const hr = hrlist2[i];

                if (hr.distinctivenessAverage < high) {
                    hrlist2.splice(i, 1);
                    i--;
                }
            }

            while (hrlist.length > 20000) {
                const randomIndex = Math.floor(Math.random() * hrlist.length);
                hrlist.splice(randomIndex, 1);
            }

            while (hrlist2.length > 20000) {
                const randomIndex = Math.floor(Math.random() * hrlist2.length);
                hrlist2.splice(randomIndex, 1);
            }

            for (i = 0; i < hrlist.length; i++) {
                list1 = hrlist[i];

                for (let n = 0; n < list1.histResults.length; n++) {
                    if (list1.histResults[n].longestSequence > 70) {
                        hrlist.splice(i, 1);
                        i--;
                        break;
                    }
                }
            }

            for (i = 0; i < hrlist2.length; i++) {
                list1 = hrlist2[i];

                for (let n = 0; n < list1.histResults.length; n++) {
                    if (list1.histResults[n].longestSequence > 70) {
                        hrlist2.splice(i, 1);
                        i--;
                        break;
                    }
                }
            }

            console.log("Histogram result counts: " + hrlist.length + ", " + hrlist2.length);

            for (let hr of hrlist) {
                for (let hr2 of hrlist2) {
                    lowestDistance = 99999;
                    compareIndex = 0;
                    compareIndexMatch = 0;

                    for (let ar of compareIndexArray) {
                        compareIndex++;
                        distanceFinal = 0;

                        for (hri = 0; hri < hr.histResults.length; hri++) {
                            result1 = hr.histResults[hri];
                            distancesFirst = result1.getDistances();
                            dist21 = result1.getDistances2();

                            binDistance = 0;
                            result2 = hr2.histResults[ar[hri]];

                            if (result1.mDistinctiveness < result2.mMinDistinctiveness || result1.mDistinctiveness > result2.mMaxDistinctiveness) {
                                distanceFinal = 99999;
                                break;
                            }

                            distancesSecond = result2.getDistances();
                            dist22 = result2.getDistances2();

                            for (i = 0; i < distancesFirst.length; i++) {
                                val = distancesFirst[i];
                                val2 = distancesSecond[i];

                                if (Math.abs(val2 - val) >= binThreshold2Negation) {
                                    binDistance += 2;
                                }

                                if (binDistance >= binThreshold) {
                                    break;
                                }
                            }

                            for (i = 0; i < dist21.length && binDistance < binThreshold; i++) {
                                val = dist21[i];
                                val2 = dist22[i];

                                if (Math.abs(val2 - val) >= binThreshold2Negation) {
                                    binDistance += 2;
                                }

                                if (binDistance >= binThreshold) {
                                    break;
                                }
                            }

                            distanceFinal += binDistance;

                            if (distanceFinal >= binThreshold) {
                                break;
                            }
                        }

                        if (lowestDistance > distanceFinal) {
                            compareIndexMatch = compareIndex - 1;
                            lowestDistance = distanceFinal;
                        }
                    }

                    distanceFinal = lowestDistance;

                    if (distanceFinal < binThreshold) {
                        const f = new FeatureMatch(hr.histResults[0].x, hr.histResults[0].y, hr2.histResults[0].x, hr2.histResults[0].y);
                        f.setRoughBinDistance(distanceFinal);
                        f.rotationArrayIndex = compareIndexMatch;
                        featureMatches.push(f);

                        ctx.strokeStyle = 'red';
                        drawArrowLine(ctx, f.x1, f.y1, f.x2 + width, f.y2, 12, 12);
                    }
                }
                matchingIndex++;
                if (matchingIndex % 1000 === 0) {
                    console.log("Features compared: " + matchingIndex + "/" + hrlist.length);
                }
            }

            rotationIndexMap.clear();
            for (i = 0; i < featureMatches.length; i++) {
                if (rotationIndexMap.has(featureMatches[i].rotationArrayIndex)) {
                    rotationIndexMap.set(featureMatches[i].rotationArrayIndex, rotationIndexMap.get(featureMatches[i].rotationArrayIndex) + 1);
                } else {
                    rotationIndexMap.set(featureMatches[i].rotationArrayIndex, 1);
                }
            }

            maxKey = 0;
            maxValue = 0;

            for (let [key, value] of rotationIndexMap.entries()) {
                if (maxValue < value) {
                    maxKey = key;
                    maxValue = value;
                }
            }

            for (i = 0; i < featureMatches.length; i++) {
                if (featureMatches[i].rotationArrayIndex !== maxKey) {
                    featureMatches.splice(i, 1);
                    i--;
                }
            }

            if (limitToBestMatches) {
                for (let x = 0; x < width + width2; x++) {
                    for (let y = 0; y < height; y++) {
                        let colorValue;
                        if (x < width) {
                            colorValue = image[x][y];
                        } else {
                            colorValue = image2[x - width][y];
                        }
                        ctx.fillStyle = `rgb(${colorValue}, ${colorValue}, ${colorValue})`;
                        ctx.fillRect(x, y, 1, 1);
                    }
                }

                // Sort featureMatches by mRoughBinDistance
                featureMatches.sort((o1, o2) => o1.mRoughBinDistance - o2.mRoughBinDistance);

                let fmi = featureMatches.length - 1;

                while (featureMatches.length > 25 && fmi >= 0) {
                    let fm = featureMatches[fmi];

                    let x = fm.getX1();
                    let y = fm.getY1();

                    for (let io = 0; io < featureMatches.length; ++io) {
                        if (io === fmi) continue;

                        let fm2 = featureMatches[io];

                        if (fm2.getX1() >= (x - 15) && fm2.getX1() <= (x + 15)) {
                            if (fm2.getY1() >= (y - 15) && fm2.getY1() <= (y + 15)) {
                                featureMatches.splice(io, 1);  // Remove the element at io

                                if (fmi > io) {
                                    fmi--;
                                }

                                io--;  // Adjust for loop after removal

                                if (featureMatches.length === 25) {
                                    fmi = -1;
                                    break;
                                }
                            }
                        }
                    }
                    fmi--;
                }

                // Remove excess elements if size is still > 25
                while (featureMatches.length > 25) {
                    featureMatches.pop();
                }

                for (const f of featureMatches) {
                    ctx.strokeStyle = 'red';
                    drawArrowLine(ctx, f.x1, f.y1, f.x2 + width, f.y2, 12, 12);
                }
            }

            console.log("Feature matching done.");
        } while (featureMatches.length < 5 || evaluateFeatureMatchCloseness(featureMatches, width, height) < 0.007);
    } while ((featureMatches.length < 5 || evaluateFeatureMatchCloseness(featureMatches, width, height) < 0.007) && binThreshold < 56);

    const estimatedTime = Date.now() - startTime;
    console.log('Ellapsed milliseconds: ' + estimatedTime);

    console.log("Finalizing montage...");

    console.log("Montage finalized.");

    const moravec3ImageName = `moravec3_${fileIndex}.png`;
    /*
    newImage3.toBlob(blob => {
        const moravec3ImageURL = URL.createObjectURL(blob);
        const moravec3ImageLink = document.createElement('a');
        moravec3ImageLink.href = moravec3ImageURL;
        moravec3ImageLink.download = moravec3ImageName;
        document.body.appendChild(moravec3ImageLink);
        moravec3ImageLink.click();
        document.body.removeChild(moravec3ImageLink);
    }, 'image/png');*/
    newImage3.toBlob(blob => {
        const moravec3ImageURL = URL.createObjectURL(blob);
        const img = new Image();
        img.src = moravec3ImageURL;

        img.onload = () => {
            // Create a canvas element
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;

            // Get the canvas context and draw the image onto it
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Append the canvas to the body
            document.body.appendChild(canvas);

            // Revoke the object URL to free up memory
            URL.revokeObjectURL(moravec3ImageURL);

            const eleSpinner = document.querySelector('.loader');
            eleSpinner.style = 'display: none;';
        };
    }, 'image/png');
}

function evaluateFeatureMatchCloseness(featureMatches, width, height) {
    console.log("Evaluating feature match closeness...");

    let minx = Infinity, maxx = 0, miny = Infinity, maxy = 0;

    for (let fm of featureMatches) {
        let x = fm.x1;
        let y = fm.y1;

        if (minx > x) {
            minx = x;
        }

        if (miny > y) {
            miny = y;
        }

        if (maxx < x) {
            maxx = x;
        }

        if (maxy < y) {
            maxy = y;
        }
    }

    const len1 = maxx - minx;
    const len2 = maxy - miny;

    const area = len1 * len2;
    const area2 = width * height;

    const matchPercent = area / area2;
    console.log("Feature match closeness: " + matchPercent);

    return matchPercent;
}

function drawArrowLine(ctx, x1, y1, x2, y2, d, h) {
    // Generate a random color
    const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;

    // Set the stroke and fill styles to the random color
    ctx.strokeStyle = randomColor;
    ctx.fillStyle = randomColor;

    let dx = x2 - x1;
    let dy = y2 - y1;
    let D = Math.sqrt(dx * dx + dy * dy);
    let xm = D - d;
    let xn = xm;
    let ym = h;
    let yn = -h;
    let sin = dy / D;
    let cos = dx / D;

    let x = xm * cos - ym * sin + x1;
    ym = xm * sin + ym * cos + y1;
    xm = x;

    x = xn * cos - yn * sin + x1;
    yn = xn * sin + yn * cos + y1;
    xn = x;

    const xpoints = [x2, xm, xn];
    const ypoints = [y2, ym, yn];

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.closePath();

    ctx.beginPath();
    ctx.moveTo(xpoints[0], ypoints[0]);
    ctx.lineTo(xpoints[1], ypoints[1]);
    ctx.lineTo(xpoints[2], ypoints[2]);
    ctx.fill();
    ctx.closePath();
}

class MoravecProcessor {
    constructor(baseThreshold = 131072, localFeatureCount = 10, localFeaturePercentage = 0.02) {
        this.mBaseThreshold = baseThreshold;
        this.mLocalFeatureCount = localFeatureCount;
        this.mLocalFeaturePercentage = localFeaturePercentage;

        this.mResults = [];
        this.mGrayscaleData = [];
    }

    async process(imageSrc) {
        const startTime = performance.now();

        const imageUtils = new ImageUtils();
        this.mGrayscaleData = await imageUtils.localGrayscaleArray(imageSrc);

        if (this.mGrayscaleData.length === 0) {
            console.log("Grayscale data invalid.");
            return;
        }

        const estimatedTime = performance.now() - startTime;
        TimeData.imageLoad += estimatedTime;
    }

    average(otherData) {
        let avg = 0.0;
        let count = 0;
        for (let row of otherData) {
            for (let value of row) {
                avg += value;
                count++;
            }
        }
        avg /= count;

        let avg2 = 0.0;
        let count2 = 0;
        for (let row of this.mGrayscaleData) {
            for (let value of row) {
                avg2 += value;
                count2++;
            }
        }
        avg2 /= count2;

        console.log(avg, avg2);

        let iters = 0;

        while (avg2 > (avg * 1.005) && iters < 100) {
            for (let i = 0; i < this.mGrayscaleData.length; ++i) {
                for (let n = 0; n < this.mGrayscaleData[i].length; ++n) {
                    this.mGrayscaleData[i][n]--;

                    if (this.mGrayscaleData[i][n] < 0) {
                        this.mGrayscaleData[i][n] = 0;
                    }
                }
            }

            avg2 = 0.0;
            count2 = 0;
            for (let row of this.mGrayscaleData) {
                for (let value of row) {
                    avg2 += value;
                    count2++;
                }
            }
            avg2 /= count2;

            console.log("GT:", avg, avg2);

            iters++;
        }

        while (avg2 < (avg * 0.995) && iters < 100) {
            for (let i = 0; i < this.mGrayscaleData.length; ++i) {
                for (let n = 0; n < this.mGrayscaleData[i].length; ++n) {
                    this.mGrayscaleData[i][n]++;

                    if (this.mGrayscaleData[i][n] > 255) {
                        this.mGrayscaleData[i][n] = 255;
                    }
                }
            }

            avg2 = 0.0;
            count2 = 0;
            for (let row of this.mGrayscaleData) {
                for (let value of row) {
                    avg2 += value;
                    count2++;
                }
            }
            avg2 /= count2;

            console.log("LT:", avg, avg2);

            iters++;
        }
    }

    log2(N) {
        return Math.log(N) / Math.log(2);
    }

    getShannonEntropyImage(x, y, endX, endY) {
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (endX >= this.mGrayscaleData.length) endX = this.mGrayscaleData.length - 1;
        if (endY >= this.mGrayscaleData[0].length) endY = this.mGrayscaleData[0].length - 1;

        const values = [];
        let n = 0;
        const occ = {};
        for (let i = y; i < endY; i++) {
            for (let j = x; j < endX; j++) {
                const pixel = this.mGrayscaleData[j][i];

                if (!values.includes(String(pixel))) values.push(String(pixel));
                occ[pixel] = (occ[pixel] || 0) + 1;
                ++n;
            }
        }

        let e = 0.0;
        for (const key in occ) {
            const p = occ[key] / n;
            e += p * this.log2(p);
        }
        return -e;
    }

    process2() {
        const startTime = performance.now();

        const width = this.mGrayscaleData.length;
        const height = this.mGrayscaleData[0].length;

        const localWidth = Math.round(width * this.mLocalFeaturePercentage);

        const localMaximumLists = [];

        for (let x = 0; x < width; x += localWidth) {
            for (let y = 0; y < height; y += localWidth) {
                let targetEndX = x + localWidth;
                let targetEndY = y + localWidth;

                if (targetEndX >= width) targetEndX = width - 1;
                if (targetEndY >= height) targetEndY = height - 1;

                const entropy = this.getShannonEntropyImage(x, y, targetEndX, targetEndY);

                if (entropy < 6) {
                    const newList = new LocalMaximumList(x, y, targetEndX, targetEndY, this.mLocalFeatureCount);
                    localMaximumLists.push(newList);
                }
            }
        }

        const xy_shifts = [
            [1, 0], [1, 1], [0, 1], [-1, 1]
        ];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let ssd = 999999999;

                for (const shift of xy_shifts) {
                    let diff = this.mGrayscaleData[x + shift[0]][y + shift[1]];
                    diff = diff - this.mGrayscaleData[x][y];
                    diff = diff * diff;

                    if (diff < ssd) {
                        ssd = diff;
                    }
                }

                if (ssd > this.mBaseThreshold) {
                    const result = new MoravecResult(ssd, x, y);

                    let matchingMaximumList = null;
                    for (const maximumList of localMaximumLists) {
                        if (maximumList.containsPoint(x, y)) {
                            matchingMaximumList = maximumList;
                            break;
                        }
                    }

                    if (matchingMaximumList) {
                        matchingMaximumList.addResult(result);
                    }
                }
            }
        }

        localMaximumLists.forEach(localMaximumList => {
            this.mResults.push(...localMaximumList.getResults());
        });

        const estimatedTime = performance.now() - startTime;
        TimeData.moravec += estimatedTime;
        TimeData.moravecTimes.push(estimatedTime);
    }

    async processWithMarkup(imageSrc) {
        const eleSpinner = document.querySelector('.loader');
        eleSpinner.style = '';
        await this.process(imageSrc);

        const imageUtils = new ImageUtils();
        const newImage = await imageUtils.markupGrayscaleWithResults(this.mGrayscaleData, this.mResults);

        return newImage;
    }

    getResults() {
        return this.mResults;
    }

    getGrayscaleData() {
        return this.mGrayscaleData;
    }
}

class MoravecResult {
    constructor(ssd = 0, x = 0, y = 0) {
        this.mMinSsd = ssd;
        this.x = x;
        this.y = y;
    }

    getMinSsd() {
        return this.mMinSsd;
    }

    setX(x) {
        this.x = x;
    }

    setY(y) {
        this.y = y;
    }

    getX() {
        return this.x;
    }

    getY() {
        return this.y;
    }

    toString() {
        return `(${this.x}, ${this.y}) ${this.mMinSsd}`;
    }
}

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class TimeData {
    static imageLoad = 0;
    static moravec = 0;
    static matching = 0;

    static matchingTimes = [];
    static moravecTimes = [];
    static distinctivenessAlignmentTimes = [];

    static binDistanceUsage = new Array(6).fill(0);
    static iterationCountUsage = new Array(10).fill(0);
    static iterationCountUsageMap = new Map();

    static featureMatches = 0;
}

// Function to load image and draw it on a canvas
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous'; // Handle CORS if the image is from another domain
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

// Function to get pixel data from an image
async function getPixelData(url) {
    const img = await loadImage(url);
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    return imageData;
}

document.getElementById('image1').addEventListener('change', handleFileSelect);
document.getElementById('image2').addEventListener('change', handleFileSelect);

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        if (event.target.id === 'image1') {
            selectedImage1 = null;
        } else {
            selectedImage2 = null;
        }

        const btnEle = document.getElementById('runBtn');

        if (!selectedImage1 || !selectedImage2) {
            btnEle.disabled = true;
        } else {
            btnEle.disabled = false;
        }

        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const url = e.target.result;
        if (event.target.id === 'image1') {
            selectedImage1 = url;
        } else {
            selectedImage2 = url;
        }

        const btnEle = document.getElementById('runBtn');

        if (!selectedImage1 || !selectedImage2) {
            btnEle.disabled = true;
        } else {
            btnEle.disabled = false;
        }
    };
    reader.readAsDataURL(file);
}
