import * as THREE from 'three';

/**
 * 大气辉光：外层背面球 + fresnel 型强度衰减。
 * 远半球中心被地球本体遮挡（深度测试），只剩贴近地球的一圈光晕。
 */
export function createAtmosphere(): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uColorInner: { value: new THREE.Color('#3f8bff') },
      uColorOuter: { value: new THREE.Color('#8a5cff') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColorInner;
      uniform vec3 uColorOuter;
      varying vec3 vNormal;

      void main() {
        // 背面球：视线轴方向法线分量越小越靠外缘；可见环带强度从内向外衰减
        float intensity = pow(max(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.4);
        float t = clamp((intensity - 0.35) / 0.9, 0.0, 1.0);
        vec3 color = mix(uColorOuter, uColorInner, t);
        gl_FragColor = vec4(color, 1.0) * intensity * 0.9;
      }
    `,
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.16, 64, 32), material);
  mesh.renderOrder = 2;
  return mesh;
}
