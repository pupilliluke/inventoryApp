const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Disables {fmt}'s C++20 `consteval` compile-time format-string checking across
 * all pods, by defining `FMT_USE_CONSTEVAL=0`.
 *
 * React Native 0.79 vendors a version of {fmt} whose format-string checks use
 * C++20 `consteval`. Xcode 26 / Apple Clang 21 tightened constant-expression
 * rules and rejects those call sites:
 *   "call to consteval function 'fmt::basic_format_string<...>' is not a
 *    constant expression"
 *
 * The failing instantiations live in any pod that includes fmt headers (folly,
 * glog, React-Core), not just the `fmt` pod — so the fix must be global. We use
 * a preprocessor define rather than downgrading the C++ language standard,
 * because React Native's New Architecture requires C++20. With
 * `FMT_USE_CONSTEVAL=0`, fmt skips the consteval path and validates format
 * strings at runtime instead.
 *
 * This is a managed (CNG) project, so ios/Podfile is generated at build time;
 * we patch the generated Podfile's post_install hook during prebuild.
 */
const FMT_FIX = `
    # Xcode 26 fmt consteval fix (see plugins/withFmtConstevalFix.js) — define
    # FMT_USE_CONSTEVAL=0 on every pod so fmt skips C++20 consteval format checks.
    installer.pods_project.targets.each do |fmt_target|
      fmt_target.build_configurations.each do |fmt_config|
        fmt_defs = fmt_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
        fmt_defs = [fmt_defs] unless fmt_defs.is_a?(Array)
        unless fmt_defs.include?('FMT_USE_CONSTEVAL=0')
          fmt_defs << 'FMT_USE_CONSTEVAL=0'
        end
        fmt_config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = fmt_defs
      end
    end
`;

module.exports = function withFmtConstevalFix(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (!contents.includes('FMT_USE_CONSTEVAL=0')) {
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
