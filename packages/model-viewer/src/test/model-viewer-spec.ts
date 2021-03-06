import {$renderer} from '../model-viewer-base.js';
import {ModelViewerElement} from '../model-viewer.js';
import {Constructor} from '../utilities.js';

import {assetPath, waitForEvent} from './helpers.js';
import {BasicSpecTemplate} from './templates.js';

const expect = chai.expect;

const LIGHTROOM_PATH = 'environments/lightroom_14b.hdr';
const SUNRISE_HDR_PATH = 'environments/spruit_sunrise_1k_HDR.hdr';
const SUNRISE_LDR_PATH = 'environments/spruit_sunrise_1k_LDR.jpg';

const COMPONENTS_PER_PIXEL = 4;

const setupModelViewer = async (modelViewer: ModelViewerElement) => {
  modelViewer.style.width = '100px';
  modelViewer.style.height = '100px';

  modelViewer.style.backgroundColor = 'rgba(255,255,255,0)';

  modelViewer.src = assetPath(
      'models/glTF-Sample-Models/2.0/MetalRoughSpheres/glTF/MetalRoughSpheres.gltf');

  modelViewer.minCameraOrbit = 'auto auto 12m';
  modelViewer.maxCameraOrbit = 'auto auto 12m';
  modelViewer.cameraOrbit = '0deg 90deg 12m';
  modelViewer.cameraTarget = '0m 0m 0m';
  modelViewer.fieldOfView = '45deg';
};

const setupLighting =
    async (modelViewer: ModelViewerElement, lighting: string) => {
  const lightingPath = assetPath(lighting);
  modelViewer.environmentImage = lightingPath;
  modelViewer.skyboxImage = lightingPath;

  await waitForEvent(modelViewer, 'poster-dismissed');
}

// TODO(sun765): this only test whether the screenshot
// is colorless or not. Replace this with more robust
// test in later pr.
function testFidelity(screenshotContext: WebGLRenderingContext) {
  const width = screenshotContext.drawingBufferWidth;
  const height = screenshotContext.drawingBufferHeight;

  const pixels = new Uint8Array(width * height * COMPONENTS_PER_PIXEL);
  // this function reads in the bottom-up direction from the coordinate
  // specified ((0,0) is the bottom-left corner).
  screenshotContext.readPixels(
      0,
      0,
      width,
      height,
      screenshotContext.RGBA,
      screenshotContext.UNSIGNED_BYTE,
      pixels);

  let colorlessPixelCountCanvas = 0;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      let isWhite = true;
      let isBlack = true;

      // read pixel data from top left corner
      const index = (height - row - 1) * width + col;
      const position = index * COMPONENTS_PER_PIXEL;

      for (let i = 0; i < 3; i++) {
        const colorComponent = pixels[position + i];
        if (colorComponent != 255) {
          isWhite = false;
        }
        if (colorComponent != 0) {
          isBlack = false;
        }
      }

      if (isWhite || isBlack) {
        colorlessPixelCountCanvas++;
      }
    }
  }

  const imagePixelCount = width * height;
  expect(colorlessPixelCountCanvas).to.be.below(imagePixelCount);
};

suite('ModelViewerElement', () => {
  let nextId: number = 0;
  let tagName: string;
  let ModelViewer: Constructor<ModelViewerElement>;

  setup(() => {
    tagName = `model-viewer-${nextId++}`;
    ModelViewer = class extends ModelViewerElement {
      static get is() {
        return tagName;
      }
    }
    customElements.define(tagName, ModelViewer);
  });

  BasicSpecTemplate(() => ModelViewer, () => tagName);

  suite('Fidelity Test', () => {
    let element: ModelViewerElement;

    setup(async () => {
      element = new ModelViewerElement();
      setupModelViewer(element);
      document.body.insertBefore(element, document.body.firstChild);
    });

    teardown(() => {
      if (element.parentNode != null) {
        element.parentNode.removeChild(element);
      }
    });

    test('Metal roughness sphere', async () => {
      await setupLighting(element, LIGHTROOM_PATH);
      const screenshotContext = element[$renderer].threeRenderer.context;
      testFidelity(screenshotContext);
    });

    test('Metal roughness sphere HDR', async () => {
      await setupLighting(element, SUNRISE_HDR_PATH);
      const screenshotContext = element[$renderer].threeRenderer.context;
      testFidelity(screenshotContext);
    });

    test('Metal roughness sphere LDR', async () => {
      await setupLighting(element, SUNRISE_LDR_PATH);
      const screenshotContext = element[$renderer].threeRenderer.context;
      testFidelity(screenshotContext);
    });
  });
})