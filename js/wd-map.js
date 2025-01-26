//分類の関係を変換するための対応データ
const kinds = { "分類": "0", "含む": "1", "一部": "2", "ついて": "3", };
const kind2str = ["分類", "含む", "一部", "ついて"];

window.addEventListener('load', async () => {
    //エリア選択の設定
    setAreaLists();

    if (getUrlParam('setting') != null) {
        //alert("setting");
        document.getElementById('dis_b').style.display = 'block';
    };

    if (getUrlParam('maps') != null) {
        // setMapList(getUrlParam('map'));
        setMapList(getUrlParam('maps'));
    }

    if (getUrlParam('area') != null) {
        setAreaOption(getUrlParam('area'));
    }

    const sendButton = document.getElementById('send');
    const checkJp = document.getElementById("onlyJP");

    //検索実行ボタンの処理
    sendButton.addEventListener('click', async () => {
        makeQuery();
    }, false);

    // checkJp.addEventListener('change', async () => {
    //     makeQuery();
    // }, false);

}, false);


function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param); // 指定したパラメータの値を返す
}

function editMAP() {
    // 現在のURLのパラメータを取得
    const editURL = getMapQrURL().replace('qr.html','index.html');//
    const params = window.location.search; // "?key=value&key2=value2" のような形式
    // index.html にパラメータを引き継いで遷移
    window.location.href = editURL;//`index.html${params}`;
}

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
    // mapURL = "https://query.wikidata.org/embed.html#"
    //     + encodeURIComponent(getMapQuery(listQuery, false));

    const mapURL = `<a href="#" onclick="showMAP('${className}','${classID}','${kind}')" target="_blank" class="button-link">MAP表示</a>`;

    const list = document.getElementById("map-list");
    const newItem = document.createElement("li");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = `${classID}/${kinds[kind]}`;
    //checkbox.value = `${className}/${classID}/${kind}`;
    checkbox.setAttribute("name", className);
    checkbox.setAttribute("cls", classID);
    checkbox.setAttribute("kind", kind);

    // const value2 = `${classID}/${kinds[kind]}`;
    // checkbox.setAttribute("value2", value2);


    const label = document.createElement("label");
    label.innerHTML = ` <b>${className}</b><span style="font-size: smaller;">[${getHtmlData("http://www.wikidata.org/entity/" + classID)}]</span>:${kind}  ${mapURL}  <a href="#" onclick="removeItem(event)" class="button-del">×</a>`;
    // label.innerHTML = ` <b>${className}</b><span style="font-size: smaller;">[${getHtmlData("http://www.wikidata.org/entity/" + classID)}]</span>:${kind}  <a href="${mapURL}" target="_blank" class="button-link">MAP表示</a>  <a href="#" onclick="removeItem(event)" class="button-del">×</a>`;
    // const label =  `<label>${className} ${getHtmlData("wd:"+classID)}- ${kind}</label>`;

    newItem.appendChild(checkbox);
    newItem.appendChild(label);
    list.appendChild(newItem);

    return checkbox;
}

function getMapQuery(listQuery, useLayer) {
    let mapQuery = document.getElementById("query_for_map").value;
    if (document.getElementById('JapanMap').checked) {
        console.log("Area==>Japan");
        //mapQuery = mapQuery.replace("?item wdt:P17 wd:Q17.", "");
    } else if (document.getElementById('WorldMap').checked) {
        mapQuery = mapQuery.replace("?item wdt:P17 wd:Q17.", "");
        console.log("Area==>Wolrd");
    } else if (document.getElementById('OtherMap').checked) {
        const area = getSelectedArea();
        //"?item wdt:P131|wdt:P131/wdt:P131|wdt:P131/wdt:P131/wdt:P131 wd:Q120730.";
        mapQuery = mapQuery.replace("?item wdt:P17 wd:Q17.", area);
        console.log("Area==>Other");
    }


    if (!useLayer) {
        mapQuery = mapQuery.replaceAll("?loc ?layer", "?loc");
    }

    return mapQuery.replace("#GET-LIST#", listQuery);
}

//現在選択しているエリアのラベルを取得する
function getSlectedArea() {
    //全体設定
    if (document.getElementById('JapanMap').checked) {
        return "日本";
    } else if (document.getElementById('WorldMap').checked) {
        return "世界地図";
    }
    //  else if (document.getElementById('OtherMap').checked) {
    //     //areaOption += "O/";
    // }

    //詳細設定 国=C, 日本の地域=JA, 都道府県=P
    const countriesSelect = document.getElementById('countries');
    const prefecturesSelect = document.getElementById('prefectures');
    const JpAreaSelect = document.getElementById('JpArea');
    // アクティブなリストを判定
    if (!countriesSelect.disabled) {
        return countriesSelect.options[countriesSelect.selectedIndex].textContent;
    }
    else if (!JpAreaSelect.disabled) {
        return JpAreaSelect.options[JpAreaSelect.selectedIndex].textContent;
    }
    else if (!prefecturesSelect.disabled) {
        return prefecturesSelect.options[prefecturesSelect.selectedIndex].textContent;
    }

    return "";
}


//MAP生成のエリアの選択状況を取得する（URLパラメータ用）
function getAreaOption() {
    let areaOption = "";

    //全体設定 日本に限定=J, 世界地図=W, 詳細設定=O
    if (document.getElementById('JapanMap').checked) {
        areaOption += "J/";
    } else if (document.getElementById('WorldMap').checked) {
        areaOption += "W/";
    } else if (document.getElementById('OtherMap').checked) {
        areaOption += "O/";
    }

    //詳細設定 国=C, 日本の地域=JA, 都道府県=P
    const countriesSelect = document.getElementById('countries');
    const prefecturesSelect = document.getElementById('prefectures');
    const JpAreaSelect = document.getElementById('JpArea');
    // アクティブなリストを判定
    if (!countriesSelect.disabled) {
        areaOption += "C/";
    }
    else if (!JpAreaSelect.disabled) {
        areaOption += "JA/";
    }
    else if (!prefecturesSelect.disabled) {
        areaOption += "P/";
    }

    //各リストの選択状況を追加
    areaOption += countriesSelect.options[countriesSelect.selectedIndex].value;
    areaOption += '/' + prefecturesSelect.options[prefecturesSelect.selectedIndex].value;
    areaOption += '/' + JpAreaSelect.options[JpAreaSelect.selectedIndex].value;

    console.log("areaOption=" + areaOption);

    return areaOption;
}

//MAP生成のエリアの選択状況を設定する（URLパラメータ用）
// ex) area=J/C/Q17/Q122723/Q23774089
function setAreaOption(areaOption) {

    const areas = areaOption.split("/");
    if (areas.length < 5) {
        console.log("areaOptionの形式エラー");
        return;
    }

    //全体設定 日本に限定=J, 世界地図=W, 詳細設定=O
    if (areas[0] == "J") {
        document.getElementById('JapanMap').checked = true;
        document.getElementById('WorldMap').checked = false;
        document.getElementById('OtherMap').checked = false;
    }
    else if (areas[0] == "W") {
        document.getElementById('JapanMap').checked = false;
        document.getElementById('WorldMap').checked = true;
        document.getElementById('OtherMap').checked = false;
    }
    else if (areas[0] == "O") {
        document.getElementById('JapanMap').checked = false;
        document.getElementById('WorldMap').checked = false;
        document.getElementById('OtherMap').checked = true;
        document.getElementById('areaSelect').style.display = 'block';
    }

    //詳細設定 国=C, 日本の地域=JA, 都道府県=P
    const countriesSelect = document.getElementById('countries');
    const prefecturesSelect = document.getElementById('prefectures');
    const JpAreaSelect = document.getElementById('JpArea');

    countriesSelect.disabled = false;  // disabledを一時的に解除
    countriesSelect.value = areas[2];
    prefecturesSelect.disabled = false;  // disabledを一時的に解除
    prefecturesSelect.value = areas[3];
    JpAreaSelect.disabled = false;  // disabledを一時的に解除
    JpAreaSelect.value = areas[4];

    // アクティブなリストの設定　→　あとは自動で状態が変わるはず
    if (areas[1] == "C") {
        document.getElementById('enableCountries').checked = true;
        countriesSelect.disabled = false;
        JpAreaSelect.disabled = true;
        prefecturesSelect.disabled = true;
    }
    else if (areas[1] == "JA") {
        document.getElementById('enableJpArea').checked = true;
        countriesSelect.disabled = true;
        JpAreaSelect.disabled = false;
        prefecturesSelect.disabled = true;
    }
    else if (areas[1] == "P") {
        document.getElementById('enablePrefectures').checked = true;
        countriesSelect.disabled = true;
        JpAreaSelect.disabled = true;
        prefecturesSelect.disabled = false;
    }

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

//QIDの一覧からラベルを得る
async function labelQuery(classIDs) {
    let endpoint = document.getElementById('ENDPOINT').value;
    if (endpoint == null) {
        endpoint = "https://query.wikidata.org/sparql";
    }
    let ids = "";
    for (let i = 0; i < classIDs.length; i++) {
        ids += " wd:" + classIDs[i];
    }
    let labelquery = `SELECT ?item ?itemLabel WHERE {
  VALUES ?item {${ids}}
  SERVICE wikibase:label { bd:serviceParam wikibase:language "ja,en". }
    }`;
    console.log(labelquery);

    const resultData = await sendSPARQLQuery(endpoint, labelquery);

    const data = resultData.results.bindings;
    // console.log(JSON.stringify(data));
    return data;// JSON.stringify(resultData);
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

function getMapOpenURL() {
    const checkboxes = document.querySelectorAll('#map-list input[type="checkbox"]:checked');
    if (checkboxes.length < 1) {
        alert(`MAPを 1 つ以上選択してください`);
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

    return mapURL;
}

function margeMAP() {
    const mapURL = getMapOpenURL();
    window.open(mapURL, '_blank');
}

function getMapQrURL() {
    const checkboxes = document.querySelectorAll('#map-list input[type="checkbox"]');

    let maps = "";
    //let maps2 = "";
    for (let i = 0; i < checkboxes.length; i++) {
        if (i > 0) { maps += "//"; }
        let ck = 0;
        if (checkboxes[i].checked) { ck = 1; }
        maps += checkboxes[i].value + '/' + ck;
        // maps += '[' + checkboxes[i].value + '/' + ck + ']';
    }
    console.log(maps);
    const areaOption = getAreaOption();

    mapURL = 'qr.html?maps=' + maps + '/area/' + areaOption;
    //window.open('qr.html?maps=' + maps + '&area=' + areaOption, '_blank');

    return mapURL;
}

//MAPのQRページを開く
function showMapQR() {
    const mapURL = getMapQrURL();
    window.open(mapURL, '_blank');
}

async function setMapList(mapsurl) {
    const maps_area = mapsurl.split("/area/");

    //エリアの処理
    if (maps_area.length == 2) {
        setAreaOption(maps_area[1]);
    }

    const maps = maps_area[0].split("//");
    //const maps = mapsurl.split("][");
    let ids = [maps.length];
    for (let i = 0; i < maps.length; i++) {
        const maplist = maps[i].split('/');
        //const maplist = maps[i].replace("[", '').replace("]", '').split('/');
        console.log("maplist[0]" + maplist[0]);
        if (maplist.length == 3) {
            ids[i] = maplist[0];
        }
        else {
            console.log(maps[i] + 'の形式エラー');
        }
    }
    console.log(ids);
    const classLabels = await labelQuery(ids);

    console.log(JSON.stringify(classLabels));
    let i = 0
    for (const map of maps) {
        const maplist = maps[i].split('/');
        //const maplist = maps[i].replace("[", '').replace("]", '').split('/');
        if (maplist.length == 3) {
            if (classLabels[i]["item"].value.endsWith(maplist[0])) {
                document.getElementById('map-list_box').style.display = 'block';
                const checkbox = addMapList(classLabels[i]["itemLabel"].value, maplist[0], kind2str[maplist[1]]);
                if (maplist[2] == 1) {
                    checkbox.checked = true;
                }
            }
            else {
                console.log(maplist[0] + 'のID不一致エラー');
            }
            //alert("MAP:"+maplist[0]+maplist[1]+maplist[2]);
        }
        else {
            console.log(map + 'の形式エラー');
        }
        i++;
    }

    if (document.getElementById("shareButtons") != null) {
        let shareButtons = `
          <!-- X (Twitter) シェアボタン -->
          <a href="javascript:void(0);" onclick="generateSNSLink('X')" class="button-X"> X で共有
          </a>
          <!-- Facebook シェアボタン -->
          <a href="javascript:void(0);" onclick="generateSNSLink('FB')" class="button-FB">Facebook</a>

          <!-- LINE シェアボタン -->
          <a href="javascript:void(0);" onclick="generateSNSLink('LINE')"  target="_blank" class="button-LINE">LINEで共有</a>

          <a href="javascript:void(0);" onclick="generateHTMLLink()" class="button-HTML">HTMLリンク</a>`;

        document.getElementById("shareButtons").innerHTML = shareButtons;
    }
}

function generateSNSLink(sns) {
    const checkboxes = document.querySelectorAll('#map-list input[type="checkbox"]:checked');
    if (checkboxes.length < 1) {
        alert(`MAPを 1 つ以上選択してください`);
        return;
    }

    const mapURL = getMapQrURL();
    let snsLink;

    if (sns == "X") {
        const encodedText = encodeURIComponent('WD巡礼マップ - Wikidataによる巡礼ルート作成');
        snsLink = `https://twitter.com/intent/tweet?url=https://wd-map.hozo.jp/${mapURL}&text=${encodedText}`;        
    }
    else if (sns == "FB") {
        snsLink = `https://www.facebook.com/sharer/sharer.php?u=https://wd-map.hozo.jp/${mapURL}`;    
    }
    else if (sns == "LINE") {
        const encodedText = encodeURIComponent('WD巡礼マップ - Wikidataによる巡礼ルート作成');
        snsLink = `https://social-plugins.line.me/lineit/share?url=https://wd-map.hozo.jp/${mapURL}`;      
    }

    console.log(sns + "-LINK:" + snsLink);
    window.open(snsLink, '_blank');

}

function generateHTMLLink() {
    const checkboxes = document.querySelectorAll('#map-list input[type="checkbox"]:checked');
    if (checkboxes.length < 1) {
        alert(`MAPを 1 つ以上選択してください`);
        return;
    }

    const mapQrURL = getMapQrURL();
    //'https://wd-map.hozo.jp/qr.html'+ window.location.search;

    const MapOpenURL = getMapOpenURL();

    let mapName = "";
    for (let i = 0; i < checkboxes.length; i++) {
        if (i > 0) {
            mapName += " + ";
        }
        mapName += checkboxes[i].getAttribute("name");
    }

    let areaName = getSlectedArea();
    if (areaName == "日本") {
        areaName = "";
    }
    else {
        areaName = "[" + areaName + "]";
    }


    // HTMLコードを生成
    const htmlCode =
        `<b style="font-size: larger;">${mapName}</b> ${areaName} 
<!-- MAP設定画面へのリンク用 -->
<a href="${mapQrURL}" target="_blank" class="button-map">MAP設定</a>
<!-- MAP表示（Wikidataのクエリサービス）へのリンク用 -->
<a href="${MapOpenURL}" target="_blank"  class="button-map-show">MAP表示</a>

<!-- ボタン表示用のCSS -->
<style>
.button-map {
  padding: 1px 3px;
  background-color: #ff8c00;
  color: #fff;
  text-decoration: none;
  border-radius: 6px;
  font-size: 0.8em;
  text-align: center;
}
.button-map-show {
  padding: 1px 3px;
  background-color: #007BFF;
  color: #fff;
  text-decoration: none;
  border-radius: 6px;
  font-size: 0.8em;
  text-align: center;
}
</style>`;

    // ポップアップ用のウィンドウを生成
    const popup = window.open("", "popup", "width=600,height=400");

    // テキストエリアとボタンを作成して中央配置
    if (popup) {
        popup.document.write(`
            <!DOCTYPE html>
            <html lang="ja">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>WD巡礼マップ：作成したMAPのリンク</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        margin: 0;
                        padding: 10px;
                        height: 100vh;
                        box-sizing: border-box;
                    }
                    textarea {
                        width: 100%;
                        max-width: 95%;
                        height: 200px;
                        margin-bottom: 20px;
                        resize: none;
                    }
                    button {
                        padding: 10px 20px;
                        font-size: 16px;
                        border: none;
                        background-color: #007BFF;
                        color: white;
                        border-radius: 5px;
                        cursor: pointer;
                    }
                    button:hover {
                        background-color: #0056b3;
                    }
                </style>
            </head>
            <body>
                <h3>作成したMAPをリンクとして使用するHTMLコードです．</h3>
                <textarea readonly>${htmlCode}</textarea>
                <button onclick="window.close()">閉じる</button>
            </body>
            </html>
        `);
        popup.document.close();
    } else {
        alert("ポップアップがブロックされました。設定を確認してください。");
    }
}

async function setMapListOLD(mapsurl) {
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
    let shareButtons = `
          <!-- Facebook シェアボタン -->
          <a href="https://www.facebook.com/sharer/sharer.php?u=https://wd-map.hozo.jp/qr.html?map-qr=${mapsurl}" target="_blank" class="button-FB">Facebookで共有</a>

          <!-- LINE シェアボタン -->
          <a href="https://social-plugins.line.me/lineit/share?url=https://wd-map.hozo.jp/qr.html?map-qr=${mapsurl}" target="_blank" class="button-LINE">LINEで共有</a>`;

    document.getElementById("shareButtons").innerHTML = shareButtons;
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

// 選択リストを生成する関数
function populateCountryList() {
    const selectElement = document.getElementById('countries');

    countries.forEach(country => {
        // <option>要素を作成
        const option = document.createElement('option');
        option.value = country.item; // Qコードをvalueに設定
        option.textContent = country.itemLabel; // 国名を表示

        // デフォルトで日本を選択
        if (country.item === 'Q17') {
            option.selected = true;
        }

        // <select>に追加
        selectElement.appendChild(option);
    });
}

// 選択リストを生成する関数
function populatePrefectureList() {
    const selectElement = document.getElementById('prefectures');

    pref.forEach(prefecture => {
        // <option>要素を作成
        const option = document.createElement('option');
        option.value = prefecture.item; // Qコードをvalueに設定
        option.textContent = prefecture.itemLabel; // 都道府県名を表示

        // デフォルトで大阪府を選択
        if (prefecture.item === 'Q122723') {
            option.selected = true;
        }

        // <select>に追加
        selectElement.appendChild(option);
    });

    selectElement.disabled = true; // 都道府県リストを無効化
}

function setAreaLists() {
    // ページ読み込み時に選択リストを生成
    populatePrefectureList();
    // ページ読み込み時に選択リストを生成
    populateCountryList();

    // 各リストとラジオボタンを取得
    // const WorldAreaRadio = document.getElementById('enableWorldArea');
    // const WorldAreaSelect = document.getElementById('WorldArea');

    const countriesRadio = document.getElementById('enableCountries');
    const countriesSelect = document.getElementById('countries');

    const prefecturesRadio = document.getElementById('enablePrefectures');
    const prefecturesSelect = document.getElementById('prefectures');

    const JpAreaRadio = document.getElementById('enableJpArea');
    const JpAreaSelect = document.getElementById('JpArea');


    const areaSelectLists = document.getElementById('areaSelect');

    document.getElementById('JapanMap').addEventListener('change', () => {
        areaSelectLists.style.display = 'none';
        // alert(document.getElementById('JapanMap').checked);
    });
    document.getElementById('WorldMap').addEventListener('change', () => {
        areaSelectLists.style.display = 'none';
        // alert("WorldMap");
    });
    document.getElementById('OtherMap').addEventListener('change', () => {
        areaSelectLists.style.display = 'block';
        // alert("OtherMap");
    });

    // イベントリスナーを設定 
    // WorldAreaRadio.addEventListener('change', () => {
    //     WorldAreaSelect.disabled = false;
    //     countriesSelect.disabled = true; 
    //     JpAreaSelect.disabled = true;
    //     prefecturesSelect.disabled = true; // 都道府県リストを無効化
    // });

    countriesRadio.addEventListener('change', () => {
        countriesSelect.disabled = false; // 国リストを有効化
        JpAreaSelect.disabled = true;
        prefecturesSelect.disabled = true; // 都道府県リストを無効化
    });

    JpAreaRadio.addEventListener('change', () => {
        JpAreaSelect.disabled = false;
        countriesSelect.disabled = true; // 国リストを無効化
        prefecturesSelect.disabled = true; // 都道府県リストを有効化
    });

    prefecturesRadio.addEventListener('change', () => {
        countriesSelect.disabled = true; // 国リストを無効化
        JpAreaSelect.disabled = true;
        prefecturesSelect.disabled = false; // 都道府県リストを有効化
    });

    // // OKボタンをクリックしたときの動作
    // okButton.addEventListener('click', () => {
    //     let activeList, selectedOption;

    //     // アクティブなリストを判定
    //     if (!countriesSelect.disabled) {
    //         activeList = '国';
    //         selectedOption = countriesSelect.options[countriesSelect.selectedIndex];
    //     } else if (!prefecturesSelect.disabled) {
    //         activeList = '都道府県';
    //         selectedOption = prefecturesSelect.options[prefecturesSelect.selectedIndex];
    //     }

    //     // 選択されたラベルと値を表示
    //     resultDiv.textContent = `${activeList}: ${selectedOption.text} (value: ${selectedOption.value})`;
    // });
}

function getSelectedArea() {
    const countriesSelect = document.getElementById('countries');
    const prefecturesSelect = document.getElementById('prefectures');
    const JpAreaSelect = document.getElementById('JpArea');
    // const WorldAreaSelect = document.getElementById('WorldArea');

    let activeList, selectedOption, areaQuery;

    // アクティブなリストを判定
    if (!countriesSelect.disabled) {
        activeList = '国';
        selectedOption = countriesSelect.options[countriesSelect.selectedIndex];
        areaQuery = `?item wdt:P17 wd:${selectedOption.value}.`
    } else if (!prefecturesSelect.disabled) {
        activeList = '日本の地域';
        selectedOption = prefecturesSelect.options[prefecturesSelect.selectedIndex];
        areaQuery = `?item wdt:P131|wdt:P131/wdt:P131|wdt:P131/wdt:P131/wdt:P131 wd:${selectedOption.value}.`
    }
    else if (!JpAreaSelect.disabled) {
        activeList = '都道府県';
        selectedOption = JpAreaSelect.options[JpAreaSelect.selectedIndex];
        areaQuery = `wd:${selectedOption.value} wdt:P150|wdt:P527 ?area .
        ?area wdt:P31 wd:Q50337.
        ?item wdt:P131|wdt:P131/wdt:P131|wdt:P131/wdt:P131/wdt:P131 ?area.`;
    }
    //     else if(!WorldAreaSelect.disabled){
    //         activeList = '世界の地域';
    //         selectedOption = WorldAreaSelect.options[WorldAreaSelect.selectedIndex];
    //         areaQuery = `wd:${selectedOption.value} wdt:P527/wdt:P17|wdt:P527/wdt:P150|wdt:P527/wdt:P527 ?area.
    //   ?area wdt:P297 ?code.`;
    //     }

    return areaQuery;
    // 選択されたラベルと値を表示
    // const 
    //resultDiv.textContent = ;
}