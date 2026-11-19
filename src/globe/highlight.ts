import * as THREE from 'three';
import type { Country } from '../types';

/**
 * 高亮层：半径略大的透明球，fragment shader 直接从拾取纹理解码国家编码，
 * 与当前 hover / 选中编码比对后着色。无需 CPU 重绘 canvas，hover 零延迟。
 */
export function createHighlight(pickTexture: THREE.Texture) {
  const uniforms = {
    uPick: { value: pickTexture },
    uHover: { value: 0 },
    uSelected: { value: 0 },
    uTime: { value: 0 },
    uHoverColor: { value: new THREE.Color('#45d3e8') },
    uSelectedColor: { value: new THREE.Color('#ff9d47') },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uPick;
      uniform float uHover;
      uniform float uSelected;
      uniform float uTime;
      uniform vec3 uHoverColor;
      uniform vec3 uSelectedColor;
      varying vec2 vUv;

      // 从拾取纹理解码国家编码（0 = 海洋/无效）。
      // 编码低位带校验位 0b1010，用于过滤抗锯齿混色产生的假编码
      float decodeId(vec2 uv) {
        vec3 s = texture2D(uPick, uv).rgb;
        float raw = floor(s.r * 255.0 + 0.5) * 65536.0
                  + floor(s.g * 255.0 + 0.5) * 256.0
                  + floor(s.b * 255.0 + 0.5);
        float ok = step(abs(mod(raw, 16.0) - 10.0), 0.5);
        return ok * floor((raw - 10.0) / 16.0 + 0.5);
      }

      void main() {
        float id = decodeId(vUv);
        float alpha = 0.0;
        vec3 color = vec3(0.0);
        if (id > 0.5 && abs(id - uSelected) < 0.5) {
          // 选中：橙色填充 + 呼吸动画
          color = uSelectedColor;
          alpha = 0.32 + 0.10 * sin(uTime * 2.2);
        } else if (id > 0.5 && abs(id - uHover) < 0.5) {
          // 悬停：亮青色填充
          color = uHoverColor;
          alpha = 0.30;
        }
        if (alpha <= 0.001) discard;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.002, 128, 64), material);
  mesh.renderOrder = 1;

  return {
    mesh,
    setHover(c: Country | null) {
      uniforms.uHover.value = c?.code ?? 0;
    },
    setSelected(c: Country | null) {
      uniforms.uSelected.value = c?.code ?? 0;
    },
    tick(now: number) {
      uniforms.uTime.value = now / 1000;
    },
  };
}
