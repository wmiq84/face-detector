class FaceDetector {
    constructor(videoElementId) {
      this.video = document.getElementById(videoElementId);
      this.canvas = null;
      this.displaySize = null;
    }

    async loadModels() {
        Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        faceapi.nets.faceExpressionNet.loadFromUri('/models')
        ]);
    }

    startVideo() {
        navigator.getUserMedia(
          { video: {} },
          stream => this.video.srcObject = stream,
          err => console.error(err)
        );
      }


      setupCanvas() {
        this.canvas = faceapi.createCanvasFromMedia(this.video);
        document.body.append(this.canvas);
        this.displaySize = { width: this.video.width, height: this.video.height };
        faceapi.matchDimensions(this.canvas, this.displaySize);
      }

    async detectFaces() {
        const detections = await faceapi.detectAllFaces(this.video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
        const resizedDetections = faceapi.resizeResults(detections, this.displaySize);
        this.canvas.getContext('2d').clearRect(0, 0, this.canvas.width, this.canvas.height);
        faceapi.draw.drawDetections(this.canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(this.canvas, resizedDetections);
        // faceapi.draw.drawFaceExpressions(this.canvas, resizedDetections);

        // Get face measurements
        const measurements = this.getFaceMeasurements(detections);
    }

    startDetection() {
        this.video.addEventListener('play', () => {
          this.setupCanvas();
          setInterval(() => this.detectFaces(), 100);
        });
      }

    getFaceMeasurements(detections) {
        const landmarks = detections[0].landmarks;
        const nose = landmarks.getNose()
        // positions found by ployying landmarks and viewing x and y values
        const leftForehead = landmarks.positions[0];
        const rightForehead = landmarks.positions[16];
        
        const leftCheekbone = landmarks.positions[1];
        const rightCheekbone = landmarks.positions[15];

        const leftJawline = landmarks.positions[3];
        const rightJawline = landmarks.positions[16];

        // Unfortunatly, forehead is not a landmark and thus an extrapolation must be made
        // I did this by multiplying my mid-nose point by 2 and subtracting the chin point
        // const forehead = ""
        const chin = landmarks.positions[18];
        const upperForeheadPositions = [
            landmarks.positions[52]._x * 2 - chin._x,
            landmarks.positions[52]._y * 2 - chin._y
        ];

        const foreHeadwidth = faceapi.euclideanDistance([leftForehead._x, leftForehead._y], [rightForehead._x, rightForehead._y]);
        const cheeksWidth = faceapi.euclideanDistance([leftCheekbone._x, leftCheekbone._y], [rightCheekbone._x, rightCheekbone._y]);
        const jawWidth = faceapi.euclideanDistance([leftJawline._x, leftJawline._y], [rightJawline._x, rightJawline._y]);
        const faceLength = faceapi.euclideanDistance([chin._x, chin._y], [upperForeheadPositions[0], upperForeheadPositions[1]]); 

        console.log(foreHeadwidth); 
        console.log(cheeksWidth); 
        console.log(jawWidth); 
        console.log(faceLength);

        const faceShape = this.calculateFaceShape(foreHeadwidth, cheeksWidth, jawWidth, faceLength);
        console.log(faceShape);
    }

    calculateFaceShape(foreheadWidth, cheeksWidth, jawWidth, faceLength) {
    
        // Test values: 83.79725060732054 83.09084979929133 83.51359679815036 120.62988338386387
        if (faceLength > cheeksWidth && cheeksWidth > foreheadWidth && cheeksWidth > jawWidth) {
          return 'Oval';
        } else if (foreheadWidth > cheeksWidth && foreheadWidth > jawWidth) {
          return 'Heart';
        } else if (jawWidth > foreheadWidth && jawWidth > cheeksWidth) {
          return 'Square';
        } else if (cheeksWidth > foreheadWidth && cheeksWidth > jawWidth) {
          return 'Round';
        } else if (faceLength > cheeksWidth && cheeksWidth > jawWidth && foreheadWidth > cheeksWidth) {
          return 'Rectangle';
        } else {
          return 'Unknown';
        }
      }
    }


const faceDetector = new FaceDetector('video');
faceDetector.loadModels().then(() => {
  faceDetector.startVideo();
  faceDetector.startDetection();
});