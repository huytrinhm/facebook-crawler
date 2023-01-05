"use strict";

function diff(setA, setB) {
  const _difference = new Set(setA);
  for (const elem of setB) {
    _difference.delete(elem);
  }
  return _difference;
}

var autoPilot = true;

var pendingRes = null;
var allFriendsHtml = "";
var initFriends = null;
var countScripts = -1;
var listScripts = [];
var myId = "";
getMyId();
var id = "";
var tabId = "";
var docId = "";

var friendCount = -1;
var finalList = [];

var file1 = null;
var file2 = null;

document
  .querySelector('input[type="button"][value="Get"]')
  .addEventListener("click", () => {
    getFriends(document.querySelector("#id").value);
  });

document
  .querySelector('input[type="button"][value="Save"]')
  .addEventListener("click", () => {
    const opts = {
      types: [{
        description: 'JSON File',
        accept: { 'application/json': ['.json'] },
      }],
    };
    
    window.showSaveFilePicker(opts).then(f => {
      f.createWritable().then(w => {
        w.write(JSON.stringify(finalList)).then(() => {
          w.close();
        });
      });
    });
  });

document.querySelector("input[name=file1]").addEventListener("change", () => {
  var file = document.querySelector("input[name=file1]").files[0];
  if (file) {
    var reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    reader.onload = function (evt) {
      file1 = JSON.parse(evt.target.result);
    };
    reader.onerror = function (evt) {
      document.querySelector("#logs").innerText = "error reading file";
    };
  }
});

document.querySelector("input[name=file2]").addEventListener("change", () => {
  var file = document.querySelector("input[name=file2]").files[0];
  if (file) {
    var reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    reader.onload = function (evt) {
      file2 = JSON.parse(evt.target.result);
    };
    reader.onerror = function (evt) {
      document.querySelector("#logs").innerText = "error reading file";
    };
  }
});

document
  .querySelector('input[type="button"][value="Diff"]')
  .addEventListener("click", () => {
    document.getElementById("logs").innerText = `${file1.length} - ${file2.length}`;

    var removed = [];
    var added = [];

    for (var i = 0; i < file1.length; i++) {
      var found = false;
      for (var j = 0; j < file2.length; j++) {
        if (file1[i].id === file2[j].id) {
          found = true;
          break;
        }
      }

      if (!found)
        removed.push(file1[i].id);
    }

    for (var i = 0; i < file2.length; i++) {
      var found = false;
      for (var j = 0; j < file1.length; j++) {
        if (file2[i].id === file1[j].id) {
          found = true;
          break;
        }
      }

      if (!found) added.push(file2[i].id);
    }

    var diffDiv = document.getElementById("diff-result");

    diffDiv.innerHTML = "";
    var constructingHTML = "";
    if (removed.length) {
      constructingHTML += '<strong>Removed</strong><div class="wrapper">';
      for (const uid of removed) {
        var user = file1.filter((u) => u.id === uid)[0];
        constructingHTML += `<div class="user"><img src="${user.image}"><a href="https://www.facebook.com/${user.id}" target="_blank" rel="noopener">${user.name}</a></div>`;
      }
      constructingHTML += '</div>';
    }

    if (added.length) {
      constructingHTML += '<strong>Added</strong><div class="wrapper">';
      for (const uid of added) {
        var user = file2.filter((u) => u.id === uid)[0];
        constructingHTML += `<div class="user"><img src="${user.image}"><a href="https://www.facebook.com/${user.id}" target="_blank" rel="noopener">${user.name}</a></div>`;
      }
      constructingHTML += "</div>";
    }

    diffDiv.innerHTML = constructingHTML;
  });

function generateFormData(obj) {
  var result = "";
  for (const [k, v] of Object.entries(obj)) {
    result += k;
    result += "=";
    if (typeof v === "object") result += encodeURIComponent(JSON.stringify(v));
    else result += encodeURIComponent(v);
    result += "&";
  }

  return result.slice(0, -1);
}

function appendToFinalList(list) {
  for (const user of list) {
    finalList.push({
      image: user?.node?.image?.uri,
      name: user?.node?.title?.text,
      mutual_count: user?.node?.subtitle_text?.aggregated_ranges[0]?.count,
      url: user?.node?.url,
      id: user?.node?.node?.id,
      aio: user?.node?.actions_renderer?.action?.client_handler?.profile_action
        ?.restrictable_profile_owner,
    });
  }

  document.querySelector("#logs").innerText = finalList.length;
}

chrome.runtime.onMessage.addListener(function (t, o, n) {
  if (t.cmd === "fetch_res") {
    if (t.url.startsWith("https://www.facebook.com/profile.php")) {
      allFriendsHtml = t.responseText;
      if (!autoPilot) return;
      initFriends = extractStartFriends(allFriendsHtml);
      tabId = initFriends["id"];
      friendCount = initFriends["items"]["count"];
      // countScripts = getScripts(allFriendsHtml);
      appendToFinalList(initFriends.pageItems.edges);
    // } else if (t.url.match(/[^"]+rsrc\.php\/[^"]+\.js[^"]+/g) !== null) {
      // listScripts.push(t.responseText);
      if (!autoPilot) return;
      if (true || countScripts !== -1 && listScripts.length === countScripts) {
        docId = "5228067753936382";
        // docId = extractDocId(listScripts);
        if (initFriends.pageItems.page_info.has_next_page === false) return;
        graphqlRequest(
          generateFormData({
            av: myId,
            __user: myId,
            fb_api_caller_class: "RelayModern",
            fb_api_req_friendly_name:
              "ProfileCometAppCollectionListRendererPaginationQuery",
            variables: {
              count: 8,
              cursor: initFriends.pageItems.page_info.end_cursor,
              scale: 1,
              search: null,
              id: tabId,
            },
            server_timestamps: true,
            doc_id: docId,
          })
        );
      }
    }
  } else if (t.cmd === "graphql_res") {
    pendingRes = t;
    if (!autoPilot) return;
    appendToFinalList(t.res.data.node.pageItems.edges);
    if (t.res.data.node.pageItems.page_info.has_next_page === false) {
      document.querySelector("#logs").innerText = `${finalList.length} - finished`;
      console.log("finished");
      return;
    }

    graphqlRequest(
      generateFormData({
        av: myId,
        __user: myId,
        fb_api_caller_class: "RelayModern",
        fb_api_req_friendly_name:
          "ProfileCometAppCollectionListRendererPaginationQuery",
        variables: {
          count: 8,
          cursor: t.res.data.node.pageItems.page_info.end_cursor,
          scale: 1,
          search: null,
          id: tabId,
        },
        server_timestamps: true,
        doc_id: docId,
      })
    );
  }
});

function graphqlRequest(query) {
  chrome.cookies.get(
    { url: "https://*.facebook.com", name: "c_user" },
    function (c_user) {
      if (null === c_user) {
        window.top.location.replace("https://www.facebook.com/login");
      } else {
        chrome.runtime.sendMessage({ cmd: "graphql_req", query });
      }
    }
  );
}

function getMyId() {
  chrome.cookies.get(
    { url: "https://*.facebook.com", name: "c_user" },
    function (c_user) {
      if (null === c_user) {
        console.error("not logged in");
      } else {
        myId = c_user.value;
      }
    }
  );
}

function getFriends(uid) {
  id = uid;
  pendingRes = null;
  allFriendsHtml = "";
  initFriends = null;
  countScripts = -1;
  listScripts = [];
  tabId = "";
  docId = "";
  friendCount = -1;
  finalList = [];

  chrome.runtime.sendMessage({
    cmd: "fetch",
    url: `https://www.facebook.com/profile.php?id=${uid}&sk=friends`,
    headers: {
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "upgrade-insecure-requests": "1",
    },
  });
}

function extractStartFriends(html) {
  var scriptRegex =
    /<script type="application\/json" data-content-len="\d+" data-sjs>(.+?)<\/script>/g;
  var fullJson = JSON.parse(
    html
      .match(scriptRegex)
      .filter((m) => m.includes("TimelineAppSection"))[0]
      .replace(scriptRegex, "$1")
  );
  var stage1 = fullJson["require"][0][3][0]["__bbox"]["require"];
  stage1 = stage1.filter((i) => i[0] === "RelayPrefetchedStreamCache")[0];
  var coll =
    stage1[3][1]["__bbox"]["result"]["data"]["node"]["all_collections"][
      "nodes"
    ][0]["style_renderer"]["collection"];
  return coll;
}

function getScripts(html) {
  var scriptUrls = html.match(/(?<=")([^"]+rsrc\.php\/[^"]+\.js[^"]+)(?=")/g);
  listScripts = [];
  for (const url of scriptUrls) {
    chrome.runtime.sendMessage({
      cmd: "fetch",
      url,
      headers: {
        "upgrade-insecure-requests": "1",
      },
    });
  }

  return scriptUrls.length;
}

function extractDocId(listScripts) {
  return listScripts
    .filter((s) =>
      s.includes(
        "ProfileCometAppCollectionListRendererPaginationQuery_facebookRelayOperation"
      )
    )[0]
    .match(
      /(?<=__d\("ProfileCometAppCollectionListRendererPaginationQuery_facebookRelayOperation",\[\],\(function\(a,b,c,d,e,f\)\{e.exports=")([0-9]+)(?=")/g
    )[0];
}
