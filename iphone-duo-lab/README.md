# Duo / Inside — single-hand edition

All phone geometry and textures remain generated in JavaScript with Three.js. No external 3D model is used.

Single hand controls:
- Open all five fingers: disassemble; make a fist: assemble.
- Touch thumb and index fingertips: fold. Move those fingertips apart: unfold.
- Move the hand left or right: rotate in that direction.
- Pinch control stays latched so opening a pinch does not accidentally start disassembly. A fist, hand loss, or the reset button clears it.
- Folding first assembles; disassembly first unfolds. These prerequisites are automatic.

The mobile camera card is 72 px tall (62 px on short landscape screens), outside the reserved 3D canvas. Progress sliders and gesture mode tabs are removed.

Camera frames are processed in a local Web Worker using MediaPipe Hand Landmarker. Video and audio are not uploaded; audio is never requested. Recognition program/data files are served by the same site, and loaded only when camera control is enabled. MediaPipe is used for camera recognition; it does not supply any phone geometry.

Render build command: node iphone-duo-lab/prepare-vision.mjs
Publish directory: iphone-duo-lab/dist

The build script retrieves the pinned official @mediapipe/tasks-vision 1.1.1 package and official Hand Landmarker float16 v1 data, and verifies their SHA-512/SHA-256 digests before extraction. The package and data do not need to be stored in Git. For local development, run node prepare-vision.mjs, then serve this directory over localhost.

Validation:
- node verify-gestures.mjs: 85 assertions covering pinch latch/release, fist/palm, rotation direction, dwell, tracking loss, scale and handedness.
- node verify-motion.mjs: 7577 assertions for the original disassembly/folding paths.
- Browser: Worker startup and blank-frame inference passed. Layout bounds checked at 390x844, 360x740 and 844x390; camera controls and canvas do not overlap.
- Real-hand operation still needs verification with the user's physical camera.

Official implementation reference: https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js
Third-party program license: dist/vendor/MEDIAPIPE-LICENSE.txt

