let generatedCode = "";
let zipProject = new JSZip();

document.getElementById("fileInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const output = document.getElementById("output");
  const downloadScriptBtn = document.getElementById("downloadBtn");
  const downloadProjectBtn = document.getElementById("downloadProjectBtn");

  output.textContent = "Processing...";
  downloadScriptBtn.disabled = true;
  downloadProjectBtn.disabled = true;

  try {
    const zip = await JSZip.loadAsync(file);
    const projectJson = await zip.file("project.json").async("string");
    const project = JSON.parse(projectJson);

    const unityRoot = zipProject.folder("UnityProject");
    const assets = unityRoot.folder("Assets");
    const sprites = assets.folder("Sprites");
    const sounds = assets.folder("Sounds");
    const scripts = assets.folder("Scripts");
    const scenes = assets.folder("Scenes");

    let result = "";

    for (const filename of Object.keys(zip.files)) {
      if (filename.endsWith(".png") || filename.endsWith(".svg")) {
        const blob = await zip.file(filename).async("uint8array");
        sprites.file(filename.split("/").pop(), blob);
      } else if (filename.endsWith(".wav") || filename.endsWith(".mp3")) {
        const blob = await zip.file(filename).async("uint8array");
        sounds.file(filename.split("/").pop(), blob);
      }
    }

    project.targets.forEach((target) => {
      let script = `using UnityEngine;\n\npublic class ${target.name}Controller : MonoBehaviour {\n`;

      const blocks = target.blocks;
      for (const blockId in blocks) {
        const block = blocks[blockId];
        const opcode = block.opcode;

        switch (opcode) {
          // EVENTS
          case "event_whenflagclicked":
            script += "  void Start() {\n";
            break;
          case "event_whenkeypressed":
            const key = block.fields.KEY_OPTION?.[0] || "space";
            script += `  void Update() {\n    if (Input.GetKeyDown(KeyCode.${key.toUpperCase()})) {\n      // action\n    }\n  }\n`;
            break;

          // MOTION
          case "motion_movesteps":
            const steps = block.inputs.STEPS?.[1]?.[1] || "10";
            script += `    transform.Translate(Vector3.right * ${steps} * Time.deltaTime);\n`;
            break;
          case "motion_turnright":
          case "motion_turnleft":
            const degrees = block.inputs.DEGREES?.[1]?.[1] || "15";
            const direction = opcode === "motion_turnright" ? "+" : "-";
            script += `    transform.Rotate(Vector3.forward * ${direction}${degrees});\n`;
            break;
          case "motion_goto":
            script += `    // Motion: go to target\n`;
            break;
          case "motion_glideto":
            script += `    // Motion: glide to position\n`;
            break;

          // LOOKS
          case "looks_sayforsecs":
          case "looks_say":
            const message = block.inputs.MESSAGE?.[1]?.[1] || "Hello!";
            script += `    Debug.Log("${message}");\n`;
            break;
          case "looks_hide":
            script += `    gameObject.SetActive(false);\n`;
            break;
          case "looks_show":
            script += `    gameObject.SetActive(true);\n`;
            break;

          // SOUND
          case "sound_play":
          case "sound_playuntildone":
            script += `    // Sound: play sound\n`;
            break;
          case "sound_stopallsounds":
            script += `    // Sound: stop all sounds\n`;
            break;

          // CONTROL
          case "control_repeat":
            const times = block.inputs.TIMES?.[1]?.[1] || "10";
            script += `    for (int i = 0; i < ${times}; i++) {\n      // repeat logic\n    }\n`;
            break;
          case "control_forever":
            script += `    while (true) {\n      // forever loop\n    }\n`;
            break;
          case "control_if":
            script += `    if (/* condition */) {\n      // if logic\n    }\n`;
            break;
          case "control_if_else":
            script += `    if (/* condition */) {\n      // if logic\n    } else {\n      // else logic\n    }\n`;
            break;
          case "control_wait":
            const waitTime = block.inputs.DURATION?.[1]?.[1] || "1";
            script += `    yield return new WaitForSeconds(${waitTime});\n`;
            break;

          // SENSING
          case "sensing_keypressed":
            script += `    if (Input.anyKeyDown) {\n      // key pressed\n    }\n`;
            break;
          case "sensing_touchingobject":
            script += `    // Sensing: check collision\n`;
            break;

          // OPERATORS
          case "operator_add":
          case "operator_subtract":
          case "operator_multiply":
          case "operator_divide":
            script += `    // Operator: math operation\n`;
            break;
          case "operator_equals":
            script += `    if (a == b) {\n      // equals\n    }\n`;
            break;
          case "operator_not":
            script += `    if (!condition) {\n      // not\n    }\n`;
            break;

          // VARIABLES
          case "data_setvariableto":
            const varName = block.fields.VARIABLE?.[0] || "myVar";
            const value = block.inputs.VALUE?.[1]?.[1] || "0";
            script += `    ${varName} = ${value};\n`;
            break;
          case "data_changevariableby":
            const change = block.inputs.VALUE?.[1]?.[1] || "1";
            script += `    ${varName} += ${change};\n`;
            break;

          // PEN EXTENSION
          case "pen_clear":
            script += `    // Pen: Clear drawing\n`;
            break;
          case "pen_penDown":
            script += `    // Pen: Start drawing\n`;
            break;
          case "pen_penUp":
            script += `    // Pen: Stop drawing\n`;
            break;
          case "pen_setPenColorToColor":
            const color = block.inputs.COLOR?.[1]?.[1] || "#000000";
            script += `    // Pen: Set color to ${color}\n`;
            break;
          case "pen_setPenSizeTo":
            const size = block.inputs.SIZE?.[1]?.[1] || "1";
            script += `    // Pen: Set size to ${size}\n`;
            break;
        }
      }

      script += "  }\n}";
      result += `\n// Sprite: ${target.name}\n${script}\n`;
      scripts.file(`${target.name}Controller.cs`, script);
    });

    const sceneContent = `
%YAML 1.1
%TAG !u! tag:unity3d.com,2011:
--- !u!1 &100000
GameObject:
  m_Name: MainScene
  m_Component:
  - component: {fileID: 10001}
  m_Transform:
    m_LocalPosition: {x: 0, y: 0, z: 0}
  m_Script:
    m_Script: {fileID: 11500000, guid: 0000000000000000a000000000000000, type: 3}
`;
    scenes.file("MainScene.unity", sceneContent);

    generatedCode = result;
    output.textContent = result || "No recognizable blocks found.";
    downloadScriptBtn.disabled = false;
    downloadProjectBtn.disabled = false;
  } catch (err) {
    output.textContent = "Error reading file: " + err.message;
  }
});

document.getElementById("downloadBtn").addEventListener("click", () => {
  const blob = new Blob([generatedCode], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ScratchConverted.cs";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("downloadProjectBtn").addEventListener("click", async () => {
  const blob = await zipProject.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "UnityProject.zip";
  a.click();
  URL.revokeObjectURL