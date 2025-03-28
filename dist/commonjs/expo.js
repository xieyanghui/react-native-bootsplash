"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.withBootSplash = void 0;
var Expo = _interopRequireWildcard(require("@expo/config-plugins"));
var _Colors = require("@expo/config-plugins/build/android/Colors");
var _codeMod = require("@expo/config-plugins/build/android/codeMod");
var _generateCode = require("@expo/config-plugins/build/utils/generateCode");
var _path = _interopRequireDefault(require("path"));
var _tsDedent = require("ts-dedent");
var _generate = require("./generate");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
const withExpoVersionCheck = platform => config => Expo.withDangerousMod(config, [platform, config => {
  (0, _generate.getExpoConfig)(config.modRequest.projectRoot); // will exit process if expo < 51.0.20
  return config;
}]);
const withAndroidAssets = (config, props) => Expo.withDangerousMod(config, ["android", config => {
  const {
    assetsDir = "assets/bootsplash"
  } = props;
  const {
    projectRoot,
    platformProjectRoot
  } = config.modRequest;
  const srcDir = _path.default.resolve(projectRoot, assetsDir, "android");
  if (!_generate.hfs.exists(srcDir)) {
    const error = `"${_path.default.relative(projectRoot, srcDir)}" doesn't exist. Did you ran the asset generation command?`;
    _generate.log.error(error);
    process.exit(1);
  }
  const destDir = _path.default.resolve(platformProjectRoot, "app", "src", "main", "res");
  for (const drawableDir of _generate.hfs.readDir(srcDir)) {
    const srcDrawableDir = _path.default.join(srcDir, drawableDir);
    const destDrawableDir = _path.default.join(destDir, drawableDir);
    if (_generate.hfs.isDir(srcDrawableDir)) {
      _generate.hfs.ensureDir(destDrawableDir);
      for (const file of _generate.hfs.readDir(srcDrawableDir)) {
        _generate.hfs.copy(_path.default.join(srcDrawableDir, file), _path.default.join(destDrawableDir, file));
      }
    }
  }
  return config;
}]);
const withAndroidManifest = config => Expo.withAndroidManifest(config, config => {
  config.modResults.manifest.application?.forEach(application => {
    if (application.$["android:name"] === ".MainApplication") {
      const {
        activity
      } = application;
      activity?.forEach(activity => {
        if (activity.$["android:name"] === ".MainActivity") {
          activity.$["android:theme"] = "@style/BootTheme";
        }
      });
    }
  });
  return config;
});
const withMainActivity = config => Expo.withMainActivity(config, config => {
  const {
    modResults
  } = config;
  const {
    language
  } = modResults;
  const withImports = (0, _codeMod.addImports)(modResults.contents.replace(/(\/\/ )?setTheme\(R\.style\.AppTheme\)/, "// setTheme(R.style.AppTheme)"), ["android.os.Bundle", "com.zoontek.rnbootsplash.RNBootSplash"], language === "java");

  // indented with 4 spaces
  const withInit = (0, _generateCode.mergeContents)({
    src: withImports,
    comment: "    //",
    tag: "bootsplash-init",
    offset: 0,
    anchor: /super\.onCreate\(null\)/,
    newSrc: "    RNBootSplash.init(this, R.style.BootTheme)" + (language === "java" ? ";" : "")
  });
  return {
    ...config,
    modResults: {
      ...modResults,
      contents: withInit.contents
    }
  };
});
const withAndroidStyles = (config, props) => Expo.withAndroidStyles(config, async config => {
  const {
    assetsDir = "assets/bootsplash",
    android = {}
  } = props;
  const {
    parentTheme,
    darkContentBarsStyle
  } = android;
  const {
    modRequest,
    modResults
  } = config;
  const {
    resources
  } = modResults;
  const {
    style = []
  } = resources;
  const manifest = await _generate.hfs.json(_path.default.resolve(modRequest.projectRoot, assetsDir, "manifest.json"));
  const item = [{
    $: {
      name: "postBootSplashTheme"
    },
    _: "@style/AppTheme"
  }, {
    $: {
      name: "bootSplashBackground"
    },
    _: "@color/bootsplash_background"
  }, {
    $: {
      name: "bootSplashLogo"
    },
    _: "@drawable/bootsplash_logo"
  }];
  if (manifest.brand != null) {
    item.push({
      $: {
        name: "bootSplashBrand"
      },
      _: "@drawable/bootsplash_brand"
    });
  }
  if (darkContentBarsStyle != null) {
    item.push({
      $: {
        name: "darkContentBarsStyle"
      },
      _: String(darkContentBarsStyle)
    });
  }
  const withBootTheme = [...style.filter(({
    $
  }) => $.name !== "BootTheme"), {
    $: {
      name: "BootTheme",
      parent: parentTheme === "TransparentStatus" ? "Theme.BootSplash.TransparentStatus" : parentTheme === "EdgeToEdge" ? "Theme.BootSplash.EdgeToEdge" : "Theme.BootSplash"
    },
    item
  }];
  return {
    ...config,
    modResults: {
      ...modResults,
      resources: {
        ...resources,
        style: withBootTheme
      }
    }
  };
});
const withAndroidColors = (config, props) => Expo.withAndroidColors(config, async config => {
  const {
    assetsDir = "assets/bootsplash"
  } = props;
  const {
    projectRoot
  } = config.modRequest;
  const manifest = await _generate.hfs.json(_path.default.resolve(projectRoot, assetsDir, "manifest.json"));
  config.modResults = (0, _Colors.assignColorValue)(config.modResults, {
    name: "bootsplash_background",
    value: manifest.background
  });
  return config;
});
const withAndroidColorsNight = (config, props) => Expo.withAndroidColorsNight(config, async config => {
  const {
    assetsDir = "assets/bootsplash"
  } = props;
  const {
    projectRoot
  } = config.modRequest;
  const manifest = await _generate.hfs.json(_path.default.resolve(projectRoot, assetsDir, "manifest.json"));
  if (manifest.darkBackground != null) {
    config.modResults = (0, _Colors.assignColorValue)(config.modResults, {
      name: "bootsplash_background",
      value: manifest.darkBackground
    });
  }
  return config;
});
const withIOSAssets = (config, props) => Expo.withDangerousMod(config, ["ios", config => {
  const {
    assetsDir = "assets/bootsplash"
  } = props;
  const {
    projectRoot,
    platformProjectRoot,
    projectName = ""
  } = config.modRequest;
  const srcDir = _path.default.resolve(projectRoot, assetsDir, "ios");
  const destDir = _path.default.resolve(platformProjectRoot, projectName);
  if (!_generate.hfs.exists(srcDir)) {
    const error = `"${_path.default.relative(projectRoot, srcDir)}" doesn't exist. Did you ran the asset generation command?`;
    _generate.log.error(error);
    process.exit(1);
  }
  (0, _generate.cleanIOSAssets)(destDir);
  _generate.hfs.copy(_path.default.join(srcDir, "BootSplash.storyboard"), _path.default.join(destDir, "BootSplash.storyboard"));
  for (const xcassetsDir of ["Colors.xcassets", "Images.xcassets"]) {
    const srcXcassetsDir = _path.default.join(srcDir, xcassetsDir);
    const destXcassetsDir = _path.default.join(destDir, xcassetsDir);
    if (_generate.hfs.isDir(srcXcassetsDir)) {
      _generate.hfs.ensureDir(destXcassetsDir);
      for (const file of _generate.hfs.readDir(srcXcassetsDir)) {
        _generate.hfs.copy(_path.default.join(srcXcassetsDir, file), _path.default.join(destXcassetsDir, file));
      }
    }
  }
  return config;
}]);
const withAppDelegate = config => Expo.withAppDelegate(config, config => {
  const {
    modResults
  } = config;
  const {
    language
  } = modResults;
  if (language !== "objc" && language !== "objcpp" && language !== "swift") {
    throw new Error(`Cannot modify the project AppDelegate as it's not in a supported language: ${language}`);
  }
  const swift = language === "swift";
  const withHeader = (0, _generateCode.mergeContents)({
    src: modResults.contents,
    comment: "//",
    tag: "bootsplash-header",
    offset: 1,
    anchor: swift ? /import Expo/ : /#import "AppDelegate\.h"/,
    newSrc: swift ? "import RNBootSplash" : '#import "RNBootSplash.h"'
  });
  const withRootView = (0, _generateCode.mergeContents)({
    src: withHeader.contents,
    comment: "//",
    tag: "bootsplash-init",
    offset: swift ? 1 : 0,
    anchor: swift ? /public class AppDelegate: ExpoAppDelegate {/ : /@end/,
    newSrc: swift ? (0, _tsDedent.dedent)`
        override func customize(_ rootView: RCTRootView!) {
          super.customize(rootView)
          RNBootSplash.initWithStoryboard("BootSplash", rootView: rootView)
        }
      ` : (0, _tsDedent.dedent)`
        - (void)customizeRootView:(RCTRootView *)rootView {
          [super customizeRootView:rootView];
          [RNBootSplash initWithStoryboard:@"BootSplash" rootView:rootView];
        }
      `
  });
  return {
    ...config,
    modResults: {
      ...modResults,
      contents: withRootView.contents
    }
  };
});
const withInfoPlist = config => Expo.withInfoPlist(config, config => {
  config.modResults["UILaunchStoryboardName"] = "BootSplash";
  return config;
});
const withXcodeProject = config => Expo.withXcodeProject(config, config => {
  const {
    projectName = ""
  } = config.modRequest;
  Expo.IOSConfig.XcodeUtils.addResourceFileToGroup({
    filepath: _path.default.join(projectName, "BootSplash.storyboard"),
    groupName: projectName,
    project: config.modResults,
    isBuildFile: true
  });
  Expo.IOSConfig.XcodeUtils.addResourceFileToGroup({
    filepath: _path.default.join(projectName, "Colors.xcassets"),
    groupName: projectName,
    project: config.modResults,
    isBuildFile: true
  });
  return config;
});
const withoutExpoSplashScreen = Expo.createRunOncePlugin(config => config, "expo-splash-screen", "skip");
const withBootSplash = (config, props = {}) => {
  const plugins = [];
  const {
    platforms = []
  } = config;
  plugins.push(withoutExpoSplashScreen);
  if (platforms.includes("android")) {
    plugins.push(withExpoVersionCheck("android"), withAndroidAssets, withAndroidManifest, withMainActivity, withAndroidStyles, withAndroidColors, withAndroidColorsNight);
  }
  if (platforms.includes("ios")) {
    plugins.push(withExpoVersionCheck("ios"), withIOSAssets, withAppDelegate, withInfoPlist, withXcodeProject);
  }
  return Expo.withPlugins(config, plugins.map(plugin => [plugin, props]));
};
exports.withBootSplash = withBootSplash;
//# sourceMappingURL=expo.js.map