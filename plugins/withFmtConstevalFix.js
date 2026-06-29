const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Disables {fmt}'s C++20 `consteval` compile-time format-string checking by
 * patching fmt's `base.h` on disk.
 *
 * React Native 0.79 vendors fmt 11.0.2. Its base.h enables FMT_USE_CONSTEVAL for
 * Apple clang >= 14, but Apple clang 21 (Xcode 26) enforces stricter constant-
 * expression rules and rejects the consteval format-string calls in
 * format-inl.h ("call to consteval function 'fmt::basic_format_string<...>' is
 * not a constant expression"), failing the build when fmt's own format.cc
 * compiles.
 *
 * A compiler `-DFMT_USE_CONSTEVAL=0` flag does NOT work: base.h unconditionally
 * redefines the macro through its own #if/#elif chain (see fmtlib/fmt#4740). So
 * we patch base.h to treat ALL Apple clang like the known-broken case, which
 * sets FMT_USE_CONSTEVAL to 0 and falls back to runtime format validation.
 *
 * fmt is downloaded by CocoaPods (not a node_module), so we run the patch in the
 * Podfile post_install hook — after the pod is fetched, before Xcode compiles.
 */
const FMT_FIX = `
    # withFmtConstevalFix (plugins/withFmtConstevalFix.js): patch fmt base.h so
    # FMT_USE_CONSTEVAL is 0 on all Apple clang (Xcode 26 / clang 21 breaks it).
    fmt_base_h = File.join(installer.sandbox.root.to_s, 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base_h)
      fmt_src = File.read(fmt_base_h)
      fmt_from = '#elif defined(__apple_build_version__) && __apple_build_version__ < 14000029L'
      fmt_to = '#elif defined(__apple_build_version__)'
      if fmt_src.include?(fmt_from)
        File.write(fmt_base_h, fmt_src.sub(fmt_from, fmt_to))
        Pod::UI.puts '[withFmtConstevalFix] Disabled FMT_USE_CONSTEVAL for Apple clang in fmt base.h'
      end
    end
`;

module.exports = function withFmtConstevalFix(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (!contents.includes('withFmtConstevalFix')) {
        const anchor = 'post_install do |installer|\n';
        if (contents.includes(anchor)) {
          contents = contents.replace(anchor, anchor + FMT_FIX);
          fs.writeFileSync(podfilePath, contents);
        } else {
          throw new Error(
            'withFmtConstevalFix: could not find "post_install do |installer|" in the Podfile.'
          );
        }
      }

      return cfg;
    },
  ]);
};
