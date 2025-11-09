let generatedCode = "";
let zipProject = new JSZip();

document.getElementById("fileInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const output = document.getElementById("output");
  const downloadScriptBtn = document.getElementById("downloadBtn");
  const downloadProjectBtn = document.getElementById("downloadProjectBtn");
  const downloadGodotBtn = document.getElementById("downloadGodotBtn");

  output.textContent = "Processing...";
  downloadScriptBtn.disabled = true;
  downloadProjectBtn.disabled = true;
  downloadGodotBtn.disabled = true;

  try {
    const zip = await JSZip.loadAsync(file);
    const projectJson = await zip.file("project.json").async("string");
    const project = JSON.parse(projectJson);

    const unityRoot = zipProject.folder("UnityProject");
    const godotRoot = zipProject.folder("GodotProject");
    const assets = unityRoot.folder("Assets");
    const sprites = assets.folder("Sprites");
    const sounds = assets.folder("Sounds");
    const scripts = assets.folder("Scripts");
    const scenes = assets.folder("Scenes");
    const godotScripts = godotRoot.folder("Scripts");

    let unityResult = "";

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
      let unityScript = `using UnityEngine;\n\npublic class ${target.name}Controller : MonoBehaviour {\n  void Start() {\n`;
      let godotScript = `extends Node2D\n\nfunc _ready():\n`;

      const blocks = target.blocks;
      for (const blockId in blocks) {
        const block = blocks[blockId];
        const opcode = block.opcode;

        switch (opcode) {
          case "event_whenflagclicked":
            unityScript += "    // When green flag clicked\n";
            godotScript += "  # When green flag clicked\n";
            break;
          case "motion_movesteps":
            const steps = block.inputs.STEPS?.[1]?.[1] || "10";
            unityScript += `    transform.Translate(Vector3.right * ${steps} * Time.deltaTime);\n`;
            godotScript += `  position.x += ${steps}\n`;
            break;
          case "looks_say":
            const message = block.inputs.MESSAGE?.[1]?.[1] || "Hello!";
            unityScript += `    Debug.Log("${message}");\n`;
            godotScript += `  print("${message}")\n`;
            break;
          case "control_repeat":
            const times = block.inputs.TIMES?.[1]?.[1] || "10";
            unityScript += `    for (int i = 0; i < ${times}; i++) {\n      // repeat logic\n    }\n`;
            godotScript += `  for i in range(${times}):\n    # repeat logic\n    pass\n`;
            break;
          default:
            unityScript += `    // Unsupported block: ${opcode}\n`;
            godotScript += `  # Unsupported block: ${opcode}\n`;
            break;
        }
      }

      unityScript += "  }\n}";
      unityResult += `\n// Sprite: ${target.name}\n${unityScript}\n`;
      scripts.file(`${target.name}Controller.cs`, unityScript);
      godotScripts.file(`${target.name}.gd`, godotScript);
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

    generatedCode = unityResult;
    output.textContent = unityResult || "No recognizable blocks found.";
    downloadScriptBtn.disabled = false;
    downloadProjectBtn.disabled = false;
    downloadGodotBtn.disabled = false;
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
  URL.revokeObjectURL(url);
});

document.getElementById("downloadGodotBtn").addEventListener("click", async () => {
  const blob = await zipProject.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "GodotProject.zip";
  a.click();
  URL.revokeObjectURL(url);
});

