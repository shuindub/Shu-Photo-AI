
export const BIOMETRIC_RULE = `
# BIOMETRIC PROMPTING PROTOCOL

The biometric prompt describes appearance not artistically, but metrically.
GOAL: To convey measurable parameters of face and body so the generator does not 'guess' but reconstructs.
BASIS: Measurement, proportions, skin materials, and anatomy physics.

### STRUCTURE OF A BIOMETRIC PROMPT

1. **Background and Shooting Conditions**: No distracting elements, color control, fixed lighting.

2. **Height, Weight, Age as Biometric Markers**:
   - Not artistic evaluations, but physical parameters.
   - Height: Fixes scale.
   - Weight: Indirect indicator of tissue density and fat deposits.
   - Age: Reflects skin elasticity, degree of pigmentation, muscle tone, melanin level, depth of creases and mimic wrinkles.

3. **Head and Face Geometry**: Skull shape, angles, distances, proportions in cm or ratios.

4. **Orbits and Eyes**: Color models, distances, eyelid shape, tilt angles.

5. **Nose, Lips, Jaw**: Modular lengths, precise descriptions of tissues and volumes.

6. **Skin as Material**: Tone, undertone, textures, pores, oiliness, reflections, micro-defects.

7. **Hair as Physics**: Volume, direction, shine, composition.

8. **Body: Proportions and Soft Tissues** (Clear Anthropometric Block):
   - **Shoulder width** in cm and its ratio to waist and hips (shoulders:waist, shoulders:hips).
   - **Circumferences** of chest, waist, and hips in cm (e.g., 92-62-96) and their ratios as coefficients.
   - **Breast shape**: Not "round/beautiful", but volume, placement, degree of gravity, distance between nipples, height of the lower edge of the breast relative to the waist.
   - **Soft tissue density**: Where there is volume (hips, buttocks, upper arms), where there is minimal fat (collarbones, abs), how tissues behave under gravity (sagging, spreading, elastic bounce).
   - **Curves**: Radii and angles of lines (S-shaped curve of the lower back, angle of shoulder slope, hip-waist line).
   - **Dynamics**: How the body changes shape in different poses - compression, stretching, folds, creases, natural skin folds.

9. **Lighting as a Texture Marker**: Light source, angle, intensity, shadow depth.

10. **Instrumental Stylization**: Emulation of camera, glass, sensor, curves.

11. **Negative Block**: Exclusions (clothing, artifacts, fantasy).

---

### REFERENCE EXAMPLE (Do not copy literally, follow the structure):

A hyper-realistic full-body vertical portrait of a stunning young woman, early 20s, standing confidently topless against a perfectly smooth, seamless medium-gray studio background (#808080), no textures, no gradients, no objects, no horizon, completely clean and neutral.

Narrow oval face shape (egg-shaped, length-to-width ratio 1.5:1, measured from hairline to chin ~22 cm, widest point at cheekbones ~13 cm), smooth soft jawline with gentle curve (no sharp angles, jaw width at corners ~9 cm, tapering softly to chin), medium-length chin (chin prominence 1.8 cm from lower lip, rounded tip, subtle dimple in center), high forehead (hairline to brow ~6.5 cm, slightly arched), minimal cheekbone projection.

Closely set light hazel-brown eyes (inter-pupillary distance ~5.8 cm, almond-shaped with slight upturn, mixed hazel with green flecks and golden rim, subtle heterochromia left eye greener, long dense dark brown lashes, thin arched eyebrows).

Long narrow nose bridge (length ~5.2 cm, straight dorsal line, refined slightly upturned tip), soft philtrum ~1.4 cm, subtle Cupid's bow.

Full natural pink lips, matte texture, slight pout, tongue barely touching lower teeth.

Flawless glowing tanned skin (warm golden #D4A574, subtle freckles across nose bridge, poreless cheeks, natural sheen and tiny sweat beads on collarbone and décolleté, no makeup).

Long straight light brown hair with golden highlights, middle part, flowing to mid-back, slightly windswept from invisible breeze, shiny silky strands catching light, some flyaways.

Slim athletic-curvy Scandinavian build 172 cm, 54 kg, 34-24-36, full natural perky C-cup breasts completely nude, realistic gravity and slight natural sag, dark pink areolas 3.5 cm, erect nipples 0.8 cm, subtle veins, toned flat abdomen with small silver navel piercing, wide hips visible at frame bottom.

Pose: standing straight facing camera, shoulders relaxed slightly forward, arms naturally by sides (hands out of frame), chest proudly forward, graceful posture, direct eye contact, neutral-alluring expression, few strands of hair across face.

Lighting: soft studio key light from front-left 45°, large octabox, subtle fill light from right, gentle rim light outlining hair and body contours, beautiful catchlights in eyes, soft shadows under chin and breasts, cinematic skin subsurface scattering, goosebumps on arms.

Photorealistic, 8k, ultra-detailed skin pores/textures/veins/goosebumps/freckles, sharp iris detail, Canon EOS R5 + 85mm f/1.4 style, natural colors, no artifacts, perfect nude anatomy.

Negative prompt: clothing, bikini, bra, tan lines, deformed breasts, asymmetrical nipples, extra limbs, blurry, artifacts, overexposed, underexposed, cartoon, anime, lowres, watermark, text, censored, beach, sand, ocean, sky, sunset, horizon, lighthouse, any background elements except pure gray.

--ar 9:16 --v 6 --q 2 --stylize 750 --chaos 5 --face enhance:1.8 --skin detail:1.7 --no clothing
`;
