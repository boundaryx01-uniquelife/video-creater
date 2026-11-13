// 데스크톱 앱 패키징 설정. 실행: npm run desktop:dist  (결과: release/)
// 코드 서명은 환경 변수로 켠다. 값이 없으면 서명 없이(macOS는 ad-hoc 서명) 빌드되고, 있으면 자동으로 서명·공증한다. 자세한 절차: docs/signing.md
//   Windows : 아래 셋 중 하나 (새로 발급되는 OV/EV 인증서는 개인키가 USB 토큰·클라우드에 있어 .pfx 로 내보낼 수 없다 → docs/signing.md)
//             ① WIN_CSC_LINK(.pfx 파일 경로) + WIN_CSC_KEY_PASSWORD
//             ② WIN_CERT_SHA1 또는 WIN_CERT_SUBJECT  (Windows 인증서 저장소·USB 토큰, 내 Windows PC에서 직접 빌드할 때)
//             ③ AZURE_TENANT_ID·AZURE_CLIENT_ID·AZURE_CLIENT_SECRET + AZ_SIGN_ENDPOINT·AZ_SIGN_ACCOUNT·AZ_SIGN_PROFILE·AZ_SIGN_PUBLISHER (Azure Artifact Signing)
//   macOS   : CSC_LINK(Developer ID Application 인증서 .p12) + CSC_KEY_PASSWORD, 공증은 APPLE_ID + APPLE_APP_SPECIFIC_PASSWORD + APPLE_TEAM_ID
const env = process.env, has = (k) => !!(env[k] && String(env[k]).trim());
const macSigned = has('CSC_LINK') && has('CSC_KEY_PASSWORD');
const notarize = macSigned && has('APPLE_ID') && has('APPLE_APP_SPECIFIC_PASSWORD') && has('APPLE_TEAM_ID');
const winPfx = has('WIN_CSC_LINK') && has('WIN_CSC_KEY_PASSWORD'), winStore = has('WIN_CERT_SHA1') || has('WIN_CERT_SUBJECT');
const winAzure = ['AZURE_TENANT_ID', 'AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZ_SIGN_ENDPOINT', 'AZ_SIGN_ACCOUNT', 'AZ_SIGN_PROFILE', 'AZ_SIGN_PUBLISHER'].every(has);
const winSign = winPfx ? { signtoolOptions: { certificateFile: env.WIN_CSC_LINK, certificatePassword: env.WIN_CSC_KEY_PASSWORD } }
  : winStore ? { signtoolOptions: { ...(has('WIN_CERT_SHA1') ? { certificateSha1: env.WIN_CERT_SHA1 } : { certificateSubjectName: env.WIN_CERT_SUBJECT }) } }
  : winAzure ? { azureSignOptions: { endpoint: env.AZ_SIGN_ENDPOINT, codeSigningAccountName: env.AZ_SIGN_ACCOUNT, certificateProfileName: env.AZ_SIGN_PROFILE, publisherName: env.AZ_SIGN_PUBLISHER } } : {};
console.log(`[서명] Windows: ${Object.keys(winSign).length ? (winPfx ? 'pfx' : winStore ? '인증서 저장소' : 'Azure') : '없음(서명 안 함)'} · macOS: ${macSigned ? '서명' + (notarize ? '+공증' : '(공증 안 함)') : 'ad-hoc'}`);

export default {
  appId: 'com.photoreel.studio',
  productName: 'Photo Reel Studio',
  electronVersion: '45.3.1',
  directories: { app: 'desktop', output: 'release', buildResources: 'build' },
  compression: 'maximum',
  electronLanguages: ['ko', 'en-US'], // Chromium 언어 파일은 한국어·영어만
  asar: false,                        // Remotion 렌더러의 실행 파일(ffmpeg 등)과 sharp 를 압축 파일 밖에 두기 위해
  npmRebuild: false,
  files: ['main.mjs', 'engine-setup.mjs', 'icon.png', 'package.json', 'ui/**', 'bundle/**', 'dist/**'],
  publish: null,
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    ...winSign, // 인증 정보가 있을 때만 서명한다(없으면 서명 건너뜀). WIN_* 는 CSC_* 와 따로 둬서 macOS 인증서와 섞이지 않게 한다
  },
  nsis: { oneClick: false, allowToChangeInstallationDirectory: true },
  mac: {
    target: [{ target: 'dmg' }, { target: 'zip' }],
    category: 'public.app-category.video',
    // 인증서가 없으면 ad-hoc 서명("-"): Apple Silicon은 서명 없는 앱이 아예 실행되지 않기 때문. Gatekeeper 경고는 남는다
    identity: macSigned ? undefined : '-',
    hardenedRuntime: macSigned,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    notarize,
  },
  linux: { target: ['AppImage', 'deb'], category: 'AudioVideo', maintainer: 'Photo Reel Studio', icon: 'icon.png' },
};
