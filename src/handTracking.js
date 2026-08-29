import {
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";

async function loadHandLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      // CPU (XNNPACK), not GPU: without real hardware acceleration in the
      // browser, the "GPU" delegate runs through a software-emulated WebGL
      // path, which is slower than well-optimized multithreaded CPU inference.
      delegate: "CPU",
    },
    runningMode: "VIDEO",
    numHands: 2,
  });
}

async function startWebcam(video) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 1280, height: 960 },
    audio: false,
  });
  video.srcObject = stream;
  await new Promise((resolve) => {
    video.onloadedmetadata = () => resolve();
  });
  await video.play();
}

/**
 * Starts webcam capture + per-frame hand landmark detection.
 * @param {{video: HTMLVideoElement, onResults: (result: object, video: HTMLVideoElement) => void, onStatus?: (msg: string) => void}} opts
 * @returns {() => void} stop function
 */
export async function startHandTracking({ video, onResults, onStatus }) {
  const report = onStatus ?? (() => {});

  report("Requesting camera…");
  await startWebcam(video);

  report("Loading hand tracking model…");
  const handLandmarker = await loadHandLandmarker();

  report("Tracking");
  let stopped = false;
  let lastVideoTime = -1;

  function tick() {
    if (stopped) return;
    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const result = handLandmarker.detectForVideo(video, performance.now());
      onResults(result, video);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  return () => {
    stopped = true;
    handLandmarker.close();
    for (const track of video.srcObject?.getTracks() ?? []) track.stop();
  };
}
