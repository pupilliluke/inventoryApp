const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Builds the `fmt` CocoaPod with the C++17 language standard.
 *
 * React Native 0.79 vendors a version of {fmt} whose compile-time format-string
 * checks use C++20 `consteval`. Xcode 26 / Apple Clang 21 tightened constant-
 * expression rules and now rejects those call sites with:
 *   "call to consteval function 'fmt::basic_format_string<...>' is not a
 *    constant expression"
 * Compiling only the fmt pod as C++17 sidesteps it: `consteval` doesn't exist
 * pre-C++20, so fmt falls back to runtime format-string validation. Scoped to
 * the fmt target so the rest of the project keeps its C++ standard.
 *
 * This is a managed (CNG) project, so the ios/Podfile is generated at build
 * time; we patch the generated Podfile's post_install hook during prebuild.
 */
const FMT_FIX = `
    # Xcode 26 fmt consteval fix — build the fmt pod as C++17 (see plugins/withFmtConstevalFix.js).
    installer.pods_project.targets.each do |fmt_target|
      if fmt_target.name == 'fmt'
        fmt_target.build_configurations.each do |fmt_config|
          fmt_config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end
      end
    end
`;

module.exports = function withFmtConstevalFix(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (!contents.includes("fmt_target.name == 'fmt'")) {
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
