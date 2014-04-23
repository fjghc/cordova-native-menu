#!/usr/bin/env node

/*
 * CordovaNativeMenu v0.1.0
 * (c) 2014 ktty1220
 * License: MIT
 */

var fs = require('fs');
var DomJS = require("dom-js").DomJS;

var rootDir = process.argv[2];

var conf = require(rootDir + '/native-menu.json');
var appId, appName;
var domjs = new DomJS();
var string = fs.readFileSync(rootDir + '/platforms/android/AndroidManifest.xml', 'utf-8');

domjs.parse(string, function(err, dom) {
  appId = dom.attributes.package;
  for (var i = 0; i < dom.children.length; i++) {
    var child = dom.children[i];
    if (child.name === 'application') {
      for (var j = 0; j < child.children.length; j++) {
        var app = child.children[j];
        if (app.name === 'activity' && app.attributes['android:configChanges'] && app.attributes['android:label']) {
          appName = app.attributes['android:name'];
        }
      }
    }
  }
  var appDir = appId.replace(/\./g, '/');
  var appSrc = rootDir + '/platforms/android/src/' + appDir + '/' + appName + '.java';
  var appJava = fs.readFileSync(appSrc, 'utf-8')
  .replace(/\s*import\s+android.view.Menu(Item)?;/g, '')
  .replace(/\s*import\s+android.util.Log;/g, '')
  .replace(/\s+public\s+boolean\s+onCreateOptionsMenu\s*\([\s\S]*?}/g, '')
  .replace(/\s+public\s+boolean\s+onOptionsItemSelected\s*\([\s\S]*?\s+return\s+[\s\S]*?}/g, '')
  .trim();

  var importLibs = [ 'android.view.Menu', 'android.view.MenuItem', 'android.util.Log' ];
  var onCreateOptionsMenu = '\n' +
    '    public boolean onCreateOptionsMenu(Menu menu) {\n' +
    '        super.onCreateOptionsMenu(menu);\n' +
    '        getMenuInflater().inflate(R.menu.menu,menu);\n' +
    '        return true;\n' +
    '    }\n';
  var onOptionsItemSelected = '\n' +
    '    public boolean onOptionsItemSelected(MenuItem item) {\n' +
    '        String itemId;\n' +
    '        switch (item.getItemId()) {';
  var menuXml = '<?xml version="1.0" encoding="utf-8"?>\n' +
    '<menu xmlns:android="http://schemas.android.com/apk/res/android">';

  var drawableDir = rootDir + '/platforms/android/res/drawable/';
  for (var k = 0; k < conf.length; k++) {
    onOptionsItemSelected += '\n' +
      '          case R.id.' + conf[k].id + ':\n' +
      '            itemId = "\'' + conf[k].id + '\'";\n' +
      '            break;';
    var resBase = (fs.existsSync(drawableDir + conf[k].icon + '.png')) ? '' : '*android:';
    menuXml += '\n' +
      '    <item android:id="@+id/' + conf[k].id + '" android:title="' + conf[k].title +
      '" android:icon="@' + resBase + 'drawable/' + conf[k].icon + '" ></item>';
  }
  onOptionsItemSelected += '\n' +
    '          default:\n' +
    '            itemId = "null";\n' +
    '            break;\n' +
    '        }\n' +
    '        Log.d("CordovaLog", "CordovaActivity.onOptionsItemSelected(" + itemId + ")");\n' +
    '        this.loadUrl("javascript:try{cordova.fireDocumentEvent(\'optionselect\',{itemId:" + itemId + "});}catch(e){console.log(\'exception firing optionselect event from native\');};");\n' +
    '        return super.onOptionsItemSelected(item);\n' +
    '    }\n';
  menuXml += '\n</menu>';
  appJava = appJava
  .replace(/(\s*public\s+class\s+)/, '\nimport ' + importLibs.join(';\nimport ') + ';$1')
  .replace(/(}\s*$)/, onCreateOptionsMenu + '$1')
  .replace(/(}\s*$)/, onOptionsItemSelected + '$1');

  fs.writeFileSync(appSrc, appJava, 'utf-8');
  var menuDir = rootDir + '/platforms/android/res/menu';
  if (! fs.existsSync(menuDir)) {
    fs.mkdirSync(menuDir, '0755');
  }
  fs.writeFileSync(menuDir + '/menu.xml', menuXml, 'utf-8');
});
