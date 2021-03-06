// // Initialize Firebase config
// var config = {
//   apiKey: "AIzaSyC5-ireu5x6zNiaLUyZyId2kJ5Chge7dDs",
//   authDomain: "parrot-db.firebaseapp.com",
//   databaseURL: "https://parrot-db.firebaseio.com",
//   storageBucket: "parrot-db.appspot.com",
//   messagingSenderId: "8731713390"
// };

// Jay's firebase
var config = {
  apiKey: "AIzaSyCN4VE64n2J8MvaaN1xpaRLN8G9dNXhQZI",
  authDomain: "alexa-parrot.firebaseapp.com",
  databaseURL: "https://alexa-parrot.firebaseio.com",
  storageBucket: "alexa-parrot.appspot.com"
};

var ADMIN_NAME_TEMP = "Hong Joon CHOI"; // need to use actual account in the future
var DB_REF;
if (DB_REF_OVERRIDE) {
  DB_REF = DB_REF_OVERRIDE;
} else {
  DB_REF = "/sentences/level/";
}
var DB_REF_TEST = "/test_sentences/level/"
var MAX_SENTENCE_LEVEL = 10000;

var unwatch;  // function used to unregister data event listener
var global_sentences;
var data_load_progress = 1;

var sort_col = 1;
var sort_ascending_order = true;
var SORT_LIST = ["level", "sentence", "used", "correct", "accuracy"];


var sentenceObjectFactory = function(_level, _sentence, _update_target) {
  var _update_date = Date();
  var _update_usr = ADMIN_NAME_TEMP;
  var _create_date = Date();
  var _create_usr = ADMIN_NAME_TEMP;
  var _used=0;
  var _correct=0;
  var _accuracy=0;

  if (_update_target) {
    _create_date = _update_target.created_at;
    _create_usr = _update_target.created_by;
    _used = _update_target.used;
    _correct = _update_target.correct;
    _accuracy = _update_target.accuracy;
  }

  return {
    sentence: _sentence,
    level: _level,
    used: _used,
    correct: _correct,
    accuracy: _accuracy,
    created_at: _create_date,
    created_by: _create_usr,
    updated_at: _update_date,
    updated_by: _update_usr,
  };
}

/*
  add sentence to firebase

  returns true if there is an error

*/
function addSentence(input_level, input_sentence, update_target, $firebaseObject) {

  liveLog("addSentence ('"+input_level+"', '"+input_sentence+"')");
  // input validation
  if (!input_level || isNaN(input_level) || !(parseInt(input_level)>0 && parseInt(input_level)<MAX_SENTENCE_LEVEL)) {
    alert("wrong level!");
    return -1;
  }
  if (!input_sentence) {
    return -2;
  }
  if (input_level!=Math.floor(input_level)) {
    alert("wrong level!");
    return -1;
  }
  input_level = Math.floor(input_level);

  // check for duplicate
  var duplicateExists = false;
  if (!update_target && global_sentences) {
    //console.log(input_level);
    //console.log(global_sentences);
    for (var i=0; i<global_sentences.length; ++i) {
      if (global_sentences[i].sentence.trim() == input_sentence.trim() && global_sentences[i].level == input_level) {
        duplicateExists = true;
      }
    }
  }
  if (duplicateExists) {
    alert("dulplicate exists!");
    return -3;
  }

  firebase.database().ref(DB_REF+input_level).push(sentenceObjectFactory(input_level, input_sentence, update_target));
  alert("sentence successfully added: ["+Math.floor(input_level)+"] "+input_sentence);
  return 0;
}


function clearTestSentencesTable() {
  liveLog("clearTestSentencesTable()");
  // input validation

  firebase.database().ref(DB_REF_TEST).remove();
  return 0;
}

function updateSentence(node, input_level, input_sentence, $firebaseObject) {
  //console.log("update sentence["+node.sentence+"] with ("+input_level+", "+input_sentence+")");
  // input validation
  if (!input_level || isNaN(input_level) || !(parseInt(input_level)>0 && parseInt(input_level)<MAX_SENTENCE_LEVEL)) {
    alert("wrong level!");
    return -1;
  }
  if (!input_sentence) {
    return -2;
  }
  if (input_level!=Math.floor(input_level)) {
    alert("wrong level!");
    return -1;
  }
  input_level = Math.floor(input_level);

  //console.log(node);
  //console.log(global_sentences);
  original_level = 1;
  for (var i=0; i<global_sentences.length; ++i) {
    if (global_sentences[i].key==node.key) {
      //console.log(i);
      //console.log(global_sentences[i]);
      original_level = global_sentences[i].level;
      //console.log("moving from level "+original_level+"to "+input_level);
    }
  }

  // remove old node
  //for (var i=1; i<10; ++i) {
  firebase.database().ref(DB_REF + original_level+"/"+node.key).remove();
  //}
  // add updated node
  addSentence(input_level, input_sentence, node, $firebaseObject);
  return 0;
}

function removeSentence (level, target_key, $firebaseObject) {
  if (confirm("delte sentence?")) {
    liveLog("removeSentence ('"+target_key+"')");
    firebase.database().ref(DB_REF + level+"/"+target_key).remove();

    /*var ref = new Firebase(config.databaseURL+"/sentencetostudy/");
    var firebaseObj = $firebaseObject(ref);

    firebaseObj.$watch(function() {
      angular.forEach(firebaseObj, function(node, key) {
        //console.log(key);
        angular.forEach(node, function(value, k){
          //console.log(k);
          //console.log(value[1]);
          //TODO: search all array
          if (!value[level]) {
            return;
          }
          for (var i=0; i<value[level].length; ++i) {
            if (target_key == value[level][i]) {
              console.log("key match, delete from /sentencetostudy/"+key+"/"+k+"/"+level+"/"+i);
              firebase.database().ref("/sentencetostudy/" + key+"/"+k+"/"+level+"/"+i).remove();
            }
          }
        });
      });

    });*/
  }
}


/*
  parse raw firebaseObj into angularjs-repeat tag consumable array form
*/
function parseSentencesData(level_input, firebaseObj) {
  //console.log("parseSentencesData()");
  var nodes = new Array();
  global_sentences = new Array();
  var global_temp = new Array();
  angular.forEach(firebaseObj, function(level_sentences, level) {
    //console.log(level_sentences);
    angular.forEach(level_sentences, function(value, k){
      value.key = k;
      value["level"] = level;
      global_temp.push(JSON.parse(JSON.stringify(value)));
      if (level == level_input || level_input=="all") {
        nodes.push(value);
      }
    });
  });
  global_sentences = global_temp.slice();
  return nodes;
}

/*
  pulls sentences data by level and registers new data event listener
*/
function pullSentencesDataByLevel(level, $scope, $firebaseObject) {
  if (level <1) {
    console.log("ERR: invalid level");
    return false;
  }

  if (unwatch) {
    unwatch();
  }
  data_load_progress=1;
  loadMsgUI();

  var ref = new Firebase(config.databaseURL+DB_REF/*+level*/);
  var firebaseObj = $firebaseObject(ref);

  unwatch = firebaseObj.$watch(function() {
    data_load_progress=-5; // signals the completion of load
    liveLog("pulled up-to date data (level "+level+")");
    $scope.data = parseSentencesData(level, firebaseObj).slice(); // copy by value
    $scope.list_length = $scope.data.length;
  });

  return true;
}

function searchFilter($scope, item){
  var sentenceFlag = true;
  var levelFlag = true;

  // special case: empty search pattern
  if (!$scope.searchValue && !$scope.searchLevelValue) {
    if (item.level==1) {
      return true;
    }
    return false;
  }

  // sentence search pattern
  if ($scope.searchValue) {
    sentenceFlag = item.sentence.toLowerCase().indexOf($scope.searchValue.toLowerCase())!=-1;
  }

  // level search pattern
  if ($scope.searchLevelValue) {
    // select all
    if ($scope.searchLevelValue=="*") {
      levelFlag = true;
    } else {
      levelFlag = (""+item.level).toLowerCase() == ($scope.searchLevelValue.toLowerCase());
    }
  }

  return sentenceFlag && levelFlag;
}

var databaseViewController = function($scope, $firebaseObject) {
  //liveLog("pulling data from firebase");
  pullSentencesDataByLevel("all", $scope,$firebaseObject);
  $scope.levelValue = "all";
  $scope.list_length = 0;

  $scope.filterByString = function(item) {
    return searchFilter($scope, item);
  }

  $scope.update = function(node, level, sentence) {
    console.log("update()");
    console.log(global_sentences);
    if (updateSentence(node, level, sentence, $firebaseObject)) {
      liveLog("updateSentence(): failed to validate input.");
    }
  }

  $scope.remove = function(node) {
    removeSentence(node.level, node.key, $firebaseObject);
  }
  $scope.searchLevelValue = "1";
}

var sentencesSortFilter = function(input, optional1, optional2) {
  if (!input) {
    return input
  }
  input.sort(function(a,b) {
    a_element = a[SORT_LIST[sort_col]];
    b_element = b[SORT_LIST[sort_col]];
    if (sort_col != 1) {
      a_element = parseInt(a_element);
      b_element = parseInt(b_element);
    }
    if (a_element>b_element) {
      return sort_ascending_order?1:-1;
    }
    if (a_element<b_element) {
      return sort_ascending_order?-1:1;
    }
    return 0;
  });
  return input;
}

var sentencesSortController = function($scope) {
  function updateSortUI() {
    $scope.sort_arrow_0 = (sort_col!=0?"--":(!sort_ascending_order?'▲':'▼'));
    $scope.sort_arrow_1 = (sort_col!=1?"--":(!sort_ascending_order?'▲':'▼'));
    $scope.sort_arrow_2 = (sort_col!=2?"--":(!sort_ascending_order?'▲':'▼'));
    $scope.sort_arrow_3 = (sort_col!=3?"--":(!sort_ascending_order?'▲':'▼'));
    $scope.sort_arrow_4 = (sort_col!=4?"--":(!sort_ascending_order?'▲':'▼'));
  }
  updateSortUI();

  $scope.changeSortRule = function(_sort_col) {
    //liveLog("changeSortRule("+sort_col+")");
    if (sort_col == _sort_col) {
      sort_ascending_order = !sort_ascending_order;
    } else {
      sort_col = _sort_col;
      sort_ascending_order = true;
    }
    updateSortUI();
  }
}

var sentenceSubmitController = function($scope, $firebaseObject) {
  $scope.submitSentence = function() {
    var err = addSentence($scope.level, $scope.sentence, null, $firebaseObject);
    if (err == -1) {
      liveLog("addSentence(): failed to validate input.");
      $scope.level="";
    } else if (err == -2) {
      liveLog("addSentence(): failed to validate input.");
      $scope.sentence="";
    }
    else {
      $scope.level="";
      $scope.sentence="";
    }
  }

  $scope.batchUpload = function(testUpload) {
    if (testUpload) {
      clearTestSentencesTable();
    }
    //console.log("uploading to test ref = "+testUpload);
    var file = document.getElementById('inputFile').files[0];
    var file_reader = new FileReader();
    //console.log(file_reader);
    //console.log(file.type);
    if (file.type=="text/plain") {
     //liveLog("text file detected");
    } else if (file.type!="application/json") {
      liveLog("ERROR: .json file required! ");
      return;
    }
    file_reader.onload = receivedText;
    file_reader.readAsText(file);
    function receivedText(e) {
      try {
        lines = e.target.result;
        var jsonResult = JSON.parse(lines);
        //console.log(jsonResult);
        for (var i=0; i<jsonResult.length; ++i) {
          if (!testUpload){
            if (addSentence(jsonResult[i].level, jsonResult[i].sentence, null, $firebaseObject)) {
              liveLog("ERROR: addSentence()");
            }
          } else {
            if (addSentenceToTest(jsonResult[i].level, jsonResult[i].sentence, null)) {
              liveLog("ERROR: TESTUPLOAD: addSentence()");
            }
          }

        }
      }
      catch(err) {
        alert("ERROR: something went wrong reading .json file");
        liveLog("ERROR: something went wrong reading .json file");
      }

    }
  }
}

function loadMsgUI () {
  //console.log("loadMsgUI("+data_load_progress+")");
  var msgHTML = "";
  for (var i=0; i<data_load_progress%4; ++i)
    msgHTML+="..";
  data_load_progress++;
  $("#loadMsg").html(msgHTML+"");
  if (data_load_progress < 0) {
    $("#loadMsg").html("");
    return;
  }
  setTimeout(loadMsgUI, 200);
}


firebase.initializeApp(config);
var myApp = angular.module("myModule", ["firebase"])
                  .controller("databaseViewController", databaseViewController)
                  .controller("sentencesSortController", sentencesSortController)
                  .controller("sentenceSubmitController", sentenceSubmitController)
                  .filter("sentencesSortFilter", function(){return sentencesSortFilter;});
