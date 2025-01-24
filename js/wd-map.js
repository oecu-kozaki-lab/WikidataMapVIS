
function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param); // 指定したパラメータの値を返す
}

window.addEventListener('load', async () => {
    if (getUrlParam('setting') != null) {
        //alert("setting");
        document.getElementById('dis_b').style.display = 'block';
    };

    if (getUrlParam('map') != null) {
        setMapList(getUrlParam('map'));
        // const maps = getUrlParam('map').split("][");
        // for (const map of maps) {
        //     const maplist = map.replace("[",'').replace("]",'').split('/');
        //     if(maplist.length==3){
        //         document.getElementById('map-list_box').style.display = 'block';
        //         addMapList(maplist[0],maplist[1],maplist[2]);
        //         //alert("MAP:"+maplist[0]+maplist[1]+maplist[2]);
        //     }
        //     else{
        //         console.log(map+'の形式エラー');
        //     }
        // }
    }

    const sendButton = document.getElementById('send');
    const checkJp = document.getElementById("onlyJP");

    //検索実行ボタンの処理
    sendButton.addEventListener('click', async () => {
        makeQuery();
    }, false);

    checkJp.addEventListener('change', async () => {
        makeQuery();
    }, false);

}, false);

//検索に用いるSPARQLクエリを生成し，実行する
async function makeQuery() {
    let endpoint = document.getElementById('ENDPOINT').value;
    if (endpoint == null) {
        endpoint = "https://query.wikidata.org/sparql";
    }
    const resultArea = document.getElementById('result_div');
    let query = document.getElementById('query_area').value;

    //入力に応じてSPARQLクエリを書き換える（書き方のサンプル）
    const textLABEL = document.getElementById('INPUT').value;
    // query = query.replace('#INPUT#',InputText);

    let ids = "";
    let conditions = "";

    if (document.getElementById('LabelFull').checked) {
        conditions = '{?item rdfs:label|skos:altLabel "' + textLABEL + '"@ja.}\n';
        conditions += 'UNION {?item rdfs:label|skos:altLabel "' + textLABEL + '"@en.}\n';
    }
    else if (document.getElementById('LabelForward').checked) {
        ids = await getWdIDsBySE(textLABEL);
        //得られたID一覧の数が上限(=50)になったら,「続きを検索」表示をON
        // if(ids.length==50){
        //     contQueryIds = true;
        // }
        const vals = ids.join(" ").replaceAll("Q", "wd:Q");
        conditions = 'VALUES ?item {' + vals + '}\n';
    }
    else if (document.getElementById('LabelAmbi').checked) {
        ids = await getWdIDs(textLABEL);
        //得られたID一覧の数が上限(=50)になったら,「続きを検索」表示をON
        // if(ids.length==50){
        //     contQueryIds = true;
        // }
        const vals = ids.join(" ").replaceAll("Q", "wd:Q");
        conditions = 'VALUES ?item {' + vals + '}\n';
    }

    query = query.replaceAll('#IDs#', conditions)
        .replaceAll('#IDcls#', conditions.replaceAll('?item', '?class'));


    document.getElementById('query_area2').value = query;

    //SPARQLクエリの実行
    resultArea.innerHTML = "";
    document.getElementById('result_box').style.display = "flex";

    dispLoading("検索中...");
    const resultData = await sendSPARQLQuery(endpoint, query);
    //removeLoading();

    document.getElementById('resjson_area').value = JSON.stringify(resultData, null, '  ');

    //dispLoading("検索中...");
    await showResult(resultData, resultArea); //クエリ結果の表示
    removeLoading();
}

/*
 * クエリ結果の表示【テーブル表示用】
 */
async function showResult(resultData, resultArea) {
    //クエリ結果のJSONデータを「ヘッダ部(keys)」と「値(data)」に分けて処理する
    const keys = resultData.head.vars;
    const data = resultData.results.bindings;

    let mesText = "<table>\n";

    // for(let j = 0; j < keys.length; j++){
    //     mesText+='<th>' +keys[j] +'</th>';
    // }
    mesText += '<tr><th></th><th>分類</th><th>関係</th><th>データ例</th></tr>\n';

    for (let i = 0; i < data.length; i++) {
        //分類の処理
        const name = data[i]["classLabel"].value;
        const cls = data[i]["class"].value.replace("http://www.wikidata.org/entity/", "");
        const kind = data[i]["kind"].value;

        const ask = await askQuery(cls, kind);
        if (ask == false) {
            console.log(`NO MAP:${name}[${cls}]-${kind}`);
        }
        else {
            mesText += "<tr>";
            mesText += `<td><button  class="button-link" onclick="showMAP('${name}','${cls}','${kind}')">MAP作成</button></td>`;
            mesText += '<td><b>'
                + name + '</b><br><span style="font-size: smaller;">['
                + getHtmlData(data[i]["class"].value)
                + ']</span></td>';
            mesText += '<td>' + kind + '</td>';

            //let val = "-";
            if (data[i]["item"] != null) {
                //val =data[i]["item"].value;
                mesText += '<td>'
                    + data[i]["itemLabel"].value
                    + '<br><span style="font-size: smaller;">['
                    + getHtmlData(data[i]["item"].value)
                    + ']</span></td>';
            }

            mesText += "</tr>";
        }
    }
    resultArea.innerHTML = mesText + '</table>';
}

function handleCheckboxChange(checkbox) {
    const cls = checkbox.getAttribute("cls");
    const kind = checkbox.getAttribute("kind");
    if (checkbox.checked) {
        alert(`You checked: ${checkbox.value}\ncls: ${cls}, kind: ${kind}`);
    } else {
        alert(`You unchecked: ${checkbox.value}\ncls: ${cls}, kind: ${kind}`);
    }
}

async function showMAP(className, classID, kind) {
    document.getElementById('map-list_box').style.display = 'block';
    console.log(className + '[' + classID + '] - ' + kind);

    addMapList(className, classID, kind);

    const listQuery = getListQuery(classID, kind);
    mapURL = "https://query.wikidata.org/embed.html#"
        + encodeURIComponent(getMapQuery(listQuery, false));

    window.open(mapURL, '_blank');
}

function addMapList(className, classID, kind) {
    console.log(`addMapList:${className}/${classID}/${kind}`);
    const listQuery = getListQuery(classID, kind);
    mapURL = "https://query.wikidata.org/embed.html#"
        + encodeURIComponent(getMapQuery(listQuery, false));

    const list = document.getElementById("map-list");
    const newItem = document.createElement("li");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = `${className}/${classID}/${kind}`;
    checkbox.setAttribute("cls", classID);
    checkbox.setAttribute("kind", kind);
    //checkbox.onclick = function () { handleCheckboxChange(checkbox); };

    const label = document.createElement("label");
    label.innerHTML = ` <b>${className}</b><span style="font-size: smaller;">[${getHtmlData("http://www.wikidata.org/entity/" + classID)}]</span>:${kind}  <a href="${mapURL}" target="_blank" class="button-link">MAP表示</a>  <a href="#" onclick="removeItem(event)" class="button-del">×</a>`;
    // const label =  `<label>${className} ${getHtmlData("wd:"+classID)}- ${kind}</label>`;

    newItem.appendChild(checkbox);
    newItem.appendChild(label);
    list.appendChild(newItem);
}

function getMapQuery(listQuery, useLayer) {
    let mapQuery = document.getElementById("query_for_map").value;
    if (!document.getElementById("onlyJP").checked) {
        mapQuery = mapQuery.replace("?item wdt:P17 wd:Q17.", "");
    }
    if (!useLayer) {
        mapQuery = mapQuery.replaceAll("?loc ?layer", "?loc");
    }

    return mapQuery.replace("#GET-LIST#", listQuery);
}

async function askQuery(classID, kind) {
    let endpoint = document.getElementById('ENDPOINT').value;
    if (endpoint == null) {
        endpoint = "https://query.wikidata.org/sparql";
    }
    const listQuery = getListQuery(classID, kind);
    let askquery = `ASK WHERE {
        ${listQuery}
        FILTER(lang(?layer)="ja")
        ?item wdt:P625 ?loc.  #位置情報の取得
        ?item wdt:P17 wd:Q17.
    }`;

    const resultData = await sendSPARQLQuery(endpoint, askquery);

    return resultData.boolean;// JSON.stringify(resultData);
}

function getListQuery(classID, kind) {
    let listQuery = "";

    if (kind == "分類") {
        listQuery = "?item wdt:P31/wdt:P279* wd:#CLASS#.\n" +
            "wd:#CLASS# rdfs:label ?layer. ";
    }
    else if (kind == "含む") {
        listQuery = "wd:#CLASS# wdt:P527 ?item.\n" +
            "wd:#CLASS# rdfs:label ?layer. ";
    }
    else if (kind == "一部") {
        listQuery = "?item wdt:P361 wd:#CLASS#.\n" +
            "wd:#CLASS# rdfs:label ?layer. ";
    }
    else if (kind == "ついて") {
        listQuery = "?item p:P31/pq:P642 wd:#CLASS#.\n" +
            "wd:#CLASS# rdfs:label ?layer. ";
    }

    listQuery = "{" + listQuery.replaceAll("#CLASS#", classID) + "}";

    return listQuery;
}

function margeMAP() {
    const checkboxes = document.querySelectorAll('#map-list input[type="checkbox"]:checked');
    if (checkboxes.length <= 1) {
        alert(`合成するMAPを 2 つ以上選択してください`);
        return;
    }

    const values = [];
    for (let i = 0; i < checkboxes.length; i++) {
        const cls = checkboxes[i].getAttribute("cls");
        const kind = checkboxes[i].getAttribute("kind");
        // values.push(checkboxes[i].value);
        values.push(getListQuery(cls, kind));
    }
    // alert(`Checked values: ${values.join(' UNION ')}`);

    const listQuery = values.join(' UNION ');
    // alert(`Checked values: ${listQuery}`);

    mapURL = "https://query.wikidata.org/embed.html#"
        + encodeURIComponent(getMapQuery(listQuery, true));

    window.open(mapURL, '_blank');
}

function getMapURL() {
    const checkboxes = document.querySelectorAll('#map-list input[type="checkbox"]');

    let maps = "";
    for (let i = 0; i < checkboxes.length; i++) {
        maps += '[' + checkboxes[i].value + ']';
    }

    // let mapURL = "https://wd-map.hozo.jp/index.html?map="+encodeURIComponent(maps);

    //'https://wd-map.hozo.jp/index.html?map='+encodeURIComponent('[空港/Q1248784/分類][空港2/Q1248784/分類]'

    window.open('qr.html?map-qr=' + maps, '_blank');
    console.log(maps);
    // return mapURL;
}

function setMapList(mapsurl) {
    const maps = mapsurl.split("][");
    for (const map of maps) {
        const maplist = map.replace("[", '').replace("]", '').split('/');
        if (maplist.length == 3) {
            document.getElementById('map-list_box').style.display = 'block';
            addMapList(maplist[0], maplist[1], maplist[2]);
            //alert("MAP:"+maplist[0]+maplist[1]+maplist[2]);
        }
        else {
            console.log(map + 'の形式エラー');
        }
    }
}

function checkAllMpas() {
    const checkboxes = document.querySelectorAll('#map-list input[type="checkbox"]');

    // すべてのチェックボックスを選択状態にする
    checkboxes.forEach(checkbox => {
        checkbox.checked = true; // チェック状態にする
    });

}

function removeItem(event) {
    event.preventDefault(); // デフォルトのリンク動作を無効化
    const listItem = event.target.closest('li'); // クリックされたリンクの親要素(li)を取得
    if (listItem) {
        listItem.remove(); // リスト項目を削除
    }
}
