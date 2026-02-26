Hand-Driven 3D Particle System

An interactive 3D particle engine driven by hand gestures using real-time webcam input.
Particles react to gestures (open hand, pinch, fist, etc.) to shape, rotate, and animate the scene.



🧠 How It Works
1️⃣ Hand Detection

The system captures live video from your webcam and detects hand landmarks (finger tips, joints, palm center).

2️⃣ Gesture Interpretation

Based on the relative positions of landmarks, gestures are identified such as:

Open hand

Pinch

Fist

Movement direction

3️⃣ Particle Interaction

The detected gesture data is mapped to:

Rotation vectors

Scaling values

Particle motion forces

Scene transformations

The result is a real-time interactive 3D particle environment.

🎮 Controls
Gesture	Action
✋ Open Hand	Rotate particle system
🤏 Pinch	Zoom in / Zoom out
✊ Fist	Reset / Trigger effect
👉 Move hand	Move particle flow direction
