// ─────────────────────────────
// 변수 선언 및 기본 설정
// ─────────────────────────────

let grid; // 2차원 배열: 각 셀은 0 또는 [brightness, source]
let w = 15; // 그리드 셀 크기
let cols, rows; // 그리드 열, 행 수

let hueValue = 200;

// 웹캠 및 캔버스, 영상 크기 설정a
let videoWidth = 1280;
let videoHeight = 720;
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;

// 웹캠 영상, FaceMesh, 음악 관련 변수
let video;
let facemesh;
let predictions = [];

let song; // mp3 음악 파일
let amplitude; // p5.Amplitude로 음악 볼륨 측정

// FaceMesh 옵션
let options = {
  maxFaces: 2,
  refineLandmarks: false,
  flipHorizontal: true
};

let pixelationActive = true; // 픽셀화 효과 활성 여부

// ─────────────────────────────
// preload() - 리소스 로드
// ─────────────────────────────
function preload() {
  song = loadSound('assets/music.mp3');
  facemesh = ml5.faceMesh(options);
}

// ─────────────────────────────
// 2차원 배열 생성 함수
// ─────────────────────────────
function make2DArray(cols, rows) {
  let arr = new Array(cols);
  for (let i = 0; i < cols; i++) {
    arr[i] = new Array(rows).fill(0);
  }
  return arr;
}

// ─────────────────────────────
// setup() - 초기화
// ─────────────────────────────
function setup() {
  video = createCapture({
    video: {
      width: {
        ideal: 1280
      },
      height: {
        ideal: 720
      }
    }
  });
  video.size(videoWidth, videoHeight);
  let cnv = createCanvas(canvasWidth, canvasHeight);
  cnv.parent(document.querySelector(".canvas"));

  pixelDensity(1);
  video.hide();

  // grid: 모래가 전체 캔버스 가로에 걸쳐 쌓이도록
  cols = floor(canvasWidth / w);
  rows = floor(canvasHeight / w);
  grid = make2DArray(cols, rows);

  // 마이크 객체 생성 및 시작
  mic = new p5.AudioIn();
  mic.start();

  // p5.Amplitude 생성 후 마이크를 입력으로 설정
  // p5.Amplitude 생성 및 음악 재생
  amplitude = new p5.Amplitude();
  amplitude.setInput(song);
  amplitude.setInput(mic);

  song.loop();
  song.setVolume(0.2);

  // FaceMesh 시작
  facemesh.detectStart(video, gotFaces);

}

// ─────────────────────────────
// FaceMesh 결과 처리
// ─────────────────────────────
function gotFaces(results) {
  predictions = results;
}

// ─────────────────────────────
// 입 벌림 감지 함수
// ─────────────────────────────
function isMouthOpen() {
  if (predictions.length > 0) {
    let keypoints = predictions[0].keypoints;
    let upperLip = keypoints[13];
    let lowerLip = keypoints[14];
    let d = dist(upperLip.x, upperLip.y, lowerLip.x, lowerLip.y);
    return d > 3;
  }
  return false;
}
// 개별 얼굴의 입이 열렸는지 검사하는 함수 (prediction을 인자로 받음)
function isMouthOpenForFace(pred) {
  let keypoints = pred.keypoints;
  let upperLip = keypoints[13];
  let lowerLip = keypoints[14];
  let d = dist(upperLip.x, upperLip.y, lowerLip.x, lowerLip.y);
  return d > 5;
}

// 개별 얼굴의 입 중앙 좌표를 계산하는 함수 (스케일 및 flip 처리 포함)
function getMouthPositionForFace(pred) {
  let keypoints = pred.keypoints;
  let upperLip = keypoints[13];
  let lowerLip = keypoints[14];
  let x = (upperLip.x + lowerLip.x) / 2;
  let y = (upperLip.y + lowerLip.y) / 2;

  // 캔버스 및 비디오 크기에 따른 스케일 조정
  let scaleX = canvasWidth / videoWidth;
  let scaleY = canvasHeight / videoHeight; // 비디오 높이의 반을 사용

  // flipHorizontal 옵션이 활성화되어 있으면 x 좌표 반전
  if (options.flipHorizontal) {
    x = videoWidth - x;
  }

  // 스케일링 적용
  x = x * scaleX;
  y = y * scaleY; // 스케일링 비율에 반 높이를 고려한 조정

  return {
    x,
    y
  };
}




// ─────────────────────────────
// 입 중앙 위치 계산 함수
// ─────────────────────────────
function getMouthPosition() {
  if (predictions.length > 0) {
    let keypoints = predictions[0].keypoints;
    let upperLip = keypoints[13];
    let lowerLip = keypoints[14];
    let scaleX = canvasWidth / videoWidth;
    let scaleY = canvasHeight / videoHeight;
    // 평균 입 중앙 좌표 (비스케일)
    let x = (upperLip.x + lowerLip.x) / 2;
    let y = (upperLip.y + lowerLip.y) / 1.8;

    // 만약 flipHorizontal 옵션을 사용한다면, x 좌표를 반전시킵니다.
    if (options.flipHorizontal) {
      x = videoWidth - x;
    }

    // 캔버스 해상도에 맞게 스케일링 적용
    return {
      x: x * scaleX,
      y: y * scaleY
    };
  }
  return null;
}

// ─────────────────────────────
// 모래 입자 생성 함수 (source: 'music' 또는 'face')
//
// source가 'music'이면 파란색, 'face'이면 녹색으로 색상 적용
// ─────────────────────────────
function spawnSandAt(x, y, source) {
  let gridCol = floor(x / w);
  let gridRow = floor(y / w);
  let vol = amplitude.getLevel();
  // brightness 값은 그대로 매핑 (예시로 255 고정)
  let br = map(vol, 0, 1, 255, 255);
  amplitude.smooth(0.9);
  let cellHue; // 생성 시 결정된 hue 값을 저장할 변수 (face 소스인 경우)
  if (source === 'face') {
    // 볼륨이 매우 낮게 나온다면 확대할 수 있음 (예: *10)
    let adjustedVol = vol * 10;
    // adjustedVol이 0~3 범위라고 가정하고, 이를 녹색 계열 hue (예: 80~160)로 매핑
    cellHue = map(adjustedVol, 0, 3, 80, 160);
  }

  let matrix = 5;
  let extent = floor(matrix / 2);
  for (let i = -extent; i <= extent; i++) {
    for (let j = -extent; j <= extent; j++) {
      if (random(1) < 0.75) {
        let col = gridCol + i;
        let row = gridRow + j;
        if (col >= 0 && col < cols && row >= 0 && row < rows) {
          if (source === 'face') {
            // 'face' 소스의 경우, [brightness, source, hue] 형태로 저장
            grid[col][row] = [br, source, cellHue];
          } else {
            // 'music' 소스는 그대로 [br, source]로 저장
            grid[col][row] = [br, source];
          }
        }
      }
    }
  }
}


// ─────────────────────────────
// 픽셀화 및 색상 복귀 관련 변수
// ─────────────────────────────
let brightnessSteps = 3;
let maxBrightnessSteps = 50;
let stepIncrease = 1;
let lastUpdateTime = 0;
let increasing = true;
let blendFactor = 0;
let pixelSize = 100;
let blendSpeed = 0.01;
let pixelationFade = 1;

function updateBrightnessSteps() {
  if (millis() - lastUpdateTime > 1000) {
    if (increasing) {
      brightnessSteps += stepIncrease;
      if (brightnessSteps >= maxBrightnessSteps) {
        increasing = false;
      }
    } else {
      if (brightnessSteps > 3) {
        brightnessSteps -= stepIncrease;
      } else {
        brightnessSteps = 3;
        increasing = true;
      }
      blendFactor += 0.05;
      blendFactor = constrain(blendFactor, 0, 1);
    }
    lastUpdateTime = millis();
  }
}

// ──────────────────────────────────────────────────────────
// [핵심] 픽셀 크기를 줄여가다가 12가 되면, 서서히 픽셀화 해제 + 태그 등장
// ──────────────────────────────────────────────────────────
function updatePixelSize() {
  // 0.2초마다 픽셀 크기 감소
  if (millis() - lastUpdateTime > 200) {
    if (pixelSize > 12) {
      pixelSize--;
    } else {
      // 픽셀 크기가 12 이하이면 blendFactor만 서서히 증가
      blendFactor += blendSpeed;
      blendFactor = constrain(blendFactor, 0, 1);
    }
    lastUpdateTime = millis();
  }

  // 픽셀 크기가 12가 되었고 아직 픽셀화가 켜져 있다면
  if (pixelSize === 12 && pixelationActive) {
    // 1초 후에 픽셀화 서서히 해제 시작
    fadeOutPixelation();

    // 동시에 태그 깜빡임/등장
    // blinkTags();
  }
}

// ──────────────────────────────────────────────────────────
// 픽셀화 알파를 점차 0까지 줄여서 완전히 해제
// ──────────────────────────────────────────────────────────
function fadeOutPixelation() {
  let interval = setInterval(() => {
    pixelationFade -= 0.001;
    if (pixelationFade <= 0) {
      pixelationFade = 0;
      // 1초 뒤에 pixelationActive = false
      setTimeout(() => {
        pixelationActive = false;
      }, 1000);
      clearInterval(interval);
    }
  }, 500);
}


// ──────────────────────────────────────────────────────────
// 5초마다 정보 태그를 하나씩 보여주고, 각각 깜빡임 + 서서히 등장
// ──────────────────────────────────────────────────────────
// function blinkTags() {
//   let infoElements = document.querySelectorAll(".personal-info > div");

//   // 먼저 전부 숨기기
//   infoElements.forEach(element => {
//     element.style.display = "none";
//     element.style.opacity = 0; // 혹시 fadeIn을 위해 초기 투명도 0 설정
//   });

//   // 요소들을 순서대로 5초 간격으로 띄우기
//   infoElements.forEach((element, index) => {
//     setTimeout(() => {
//       element.style.display = "block";
//       // 깜빡임 효과 → 끝나면 fadeIn
//       blinkEffect(element, () => fadeIn(element));
//     }, 5000 * (index + 1)); // index=0 → 5초 뒤, index=1 → 10초 뒤 ...
//   });

//   // 점점 깜빡임이 빨라지는 함수
//   function blinkEffect(element, callback) {
//     let count = 0;
//     let interval = setInterval(() => {
//       element.style.visibility =
//         (element.style.visibility === "hidden") ? "visible" : "hidden";
//       count++;
//       if (count >= 10) {
//         // 10번 깜빡이면 종료
//         clearInterval(interval);
//         element.style.visibility = "visible";
//         callback(); // 깜빡임이 끝나면 페이드인 실행
//       }
//     }, Math.max(50, 200 - count * 15));
//   }

//   // 서서히 불투명해지는 함수
//   function fadeIn(element) {
//     let opacity = 0;
//     let interval = setInterval(() => {
//       if (opacity >= 1) {
//         clearInterval(interval);
//       } else {
//         opacity += 0.05;
//         element.style.opacity = opacity;
//       }
//     }, 50);
//   }
// }


// ─────────────────────────────
// 웹캠 픽셀화 함수
// ─────────────────────────────
function pixelateVideo() {
  // (1) pixelationFade가 0이고 pixelationActive가 해제되었다면, 그냥 원본 출력
  if (!pixelationActive && pixelationFade <= 0) {
    image(video, 0, 0, videoWidth, videoHeight);
    return;
  }


  updatePixelSize();
  video.loadPixels();
  if (video.pixels.length > 0) {
    // pixelSize 크기로 픽셀화
    for (let y = 0; y < videoHeight; y += pixelSize) {
      for (let x = 0; x < videoWidth; x += pixelSize) {
        let index = (x + y * videoWidth) * 4;

        // (2) 원본 영상의 픽셀 색상
        let origR = video.pixels[index];
        let origG = video.pixels[index + 1];
        let origB = video.pixels[index + 2];

        // (3) 픽셀화(단계화)한 색상 구하기
        let brightness = 0.299 * origR + 0.587 * origG + 0.114 * origB;
        let rPix, gPix, bPix;
        if (brightness < 64) {
          rPix = 0;
          gPix = 0;
          bPix = 0;
        } else if (brightness < 128) {
          rPix = 0;
          gPix = 60;
          bPix = 180;
        } else if (brightness < 192) {
          rPix = 30;
          gPix = 180;
          bPix = 60;
        } else {
          rPix = 255;
          gPix = 220;
          bPix = 50;
        }

        // (4) pixelationFade(0~1)를 이용해 원본과 픽셀화를 보간
        // pixelationFade = 1 → 완전 픽셀화 색
        // pixelationFade = 0 → 완전 원본 영상
        let finalR = lerp(origR, rPix, pixelationFade);
        let finalG = lerp(origG, gPix, pixelationFade);
        let finalB = lerp(origB, bPix, pixelationFade);

        fill(finalR, finalG, finalB);
        noStroke();
        rect(x, y, pixelSize, pixelSize);
      }
    }
  }
}

// ─────────────────────────────
// draw() - 매 프레임마다 화면 업데이트
// ─────────────────────────────
function draw() {
  clear();
  updateBrightnessSteps();

  // 음악 볼륨에 따라 상단(하늘)에서 모래 입자 생성 (music → blue)
  let vol = amplitude.getLevel();
  let spawnCount = floor(map(vol, 0, 0.3, 0, 5));
  for (let i = 0; i < spawnCount; i++) {
    let x = random(0, canvasWidth);
    spawnSandAt(x, 0, 'music');
  }

  // 웹캠 픽셀화 효과를 가로로 꽉 채우도록 scale 적용
  push();
  // scaleFactor를 계산: videoWidth가 500일 때, 캔버스 가로(canvasWidth)로 맞추기
  let scaleFactor = canvasWidth / videoWidth;
  scale(scaleFactor); // 모든 그리기 좌표에 scaleFactor를 곱함
  drawingContext.beginPath();
  // 세로는 videoHeight의 절반만 클리핑 (원하는 영역 조절 가능)
  drawingContext.rect(0, 0, videoWidth, videoHeight / 2);
  drawingContext.clip();
  pixelateVideo();
  pop();

  // FaceMesh 입 감지 (face → green)
  // FaceMesh 예측값(여러 얼굴)에 대해 반복하여 처리
  for (let i = 0; i < predictions.length; i++) {
    let pred = predictions[i];
    if (isMouthOpenForFace(pred)) {
      let mouthPos = getMouthPositionForFace(pred);
      if (mouthPos) {
        spawnSandAt(mouthPos.x, mouthPos.y, 'face');
      }
    }
  }

  // grid에 저장된 모래 입자들을 그림 (source에 따라 색상 선택)
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (grid[i][j] !== 0) {
        let cell = grid[i][j]; // cell = [brightness, source] 또는 [brightness, source, hue]
        noStroke();
        if (cell[1] === 'music') {
          // 음악 모래: 파란색 계열 (예: RGB 모드)
          fill(cell[0], cell[0], cell[0]);
        } else if (cell[1] === 'face') {
          // 얼굴 모래: 생성 시 결정된 hue 값을 사용
          // HSB 모드로 설정하여 색상을 결정 (채도 255, 밝기는 cell[0])
          if (cell.length >= 3) {
            colorMode(HSB, 255);
            fill(cell[2], 255, cell[0]);
            colorMode(RGB);
          } else {
            // 혹은 기본 녹색 계열 (fallback)
            fill(0, cell[0], 0);
          }
        }
        let x = i * w;
        let y = j * w;
        square(x, y, w);
      }
    }
  }


  // 모래 입자의 낙하(중력 효과) 시뮬레이션
  let nextGrid = make2DArray(cols, rows);
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      let state = grid[i][j];
      if (state !== 0) {
        if (j === rows - 1) {
          nextGrid[i][j] = state;
          continue;
        }
        let below = grid[i][j + 1];
        let dir = random(1) < 0.5 ? 1 : -1;
        let belowA = (i + dir >= 0 && i + dir < cols) ? grid[i + dir][j + 1] : -1;
        let belowB = (i - dir >= 0 && i - dir < cols) ? grid[i - dir][j + 1] : -1;

        if (below === 0) {
          nextGrid[i][j + 1] = state;
        } else if (belowA === 0) {
          nextGrid[i + dir][j + 1] = state;
        } else if (belowB === 0) {
          nextGrid[i - dir][j + 1] = state;
        } else {
          nextGrid[i][j] = state;
        }
      }
    }
  }
  grid = nextGrid;
}