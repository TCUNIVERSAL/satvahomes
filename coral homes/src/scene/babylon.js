// Single entry point for Babylon.js. Deep imports keep the bundle small
// (importing '@babylonjs/core' pulls in the whole engine); the side-effect
// imports register the scene components this app relies on.
export { Engine } from '@babylonjs/core/Engines/engine';
export { Constants } from '@babylonjs/core/Engines/constants';
export { Scene } from '@babylonjs/core/scene';
export { Camera } from '@babylonjs/core/Cameras/camera';
export { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
export { Vector3, Matrix, Quaternion } from '@babylonjs/core/Maths/math.vector';
export { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
export { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
export { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
export { PointLight } from '@babylonjs/core/Lights/pointLight';
export { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
export { EquiRectangularCubeTexture } from '@babylonjs/core/Materials/Textures/equiRectangularCubeTexture';
export { Texture } from '@babylonjs/core/Materials/Textures/texture';
export { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
export { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
export { PBRMaterial } from '@babylonjs/core/Materials/PBR/pbrMaterial';
export { ImageProcessingConfiguration } from '@babylonjs/core/Materials/imageProcessingConfiguration';
export { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
export { Mesh } from '@babylonjs/core/Meshes/mesh';
export { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
export { Ray } from '@babylonjs/core/Culling/ray';
export { DefaultRenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
export { SSAO2RenderingPipeline } from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline';

import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import '@babylonjs/core/Materials/Textures/baseTexture.polynomial';
import '@babylonjs/core/Meshes/instancedMesh';
import '@babylonjs/core/Materials/multiMaterial';
import '@babylonjs/core/Behaviors/Cameras/autoRotationBehavior';
import '@babylonjs/core/Rendering/outlineRenderer';
import '@babylonjs/core/Rendering/geometryBufferRendererSceneComponent';
import '@babylonjs/core/Rendering/prePassRendererSceneComponent';
import '@babylonjs/core/Rendering/depthRendererSceneComponent';
import '@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipelineManagerSceneComponent';
