
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

    //エリア選択の設定
    setAreaLists();

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
    if (document.getElementById('JapanMap').checked) {
        console.log("Area==>Japan");
        //mapQuery = mapQuery.replace("?item wdt:P17 wd:Q17.", "");
    }else if (document.getElementById('WorldMap').checked) {
        mapQuery = mapQuery.replace("?item wdt:P17 wd:Q17.", "");
        console.log("Area==>Wolrd");
    }else if (document.getElementById('OtherMap').checked) {
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

    // X (Twitter) シェアボタン がURLのエンコードが上手く認識されず保留
    // const encodedurl = 'https://wd-map.hozo.jp/qr.html?map-qr='+encodeURIComponent(mapsurl);
    // console.log(encodedurl);

    // // URLをエンコード
    // const encodedUrl = encodeURIComponent('https://wd-map.hozo.jp/qr.html?map-qr='+mapsurl.replaceAll("[","").replaceAll("]",""));
    // const encodedText = encodeURIComponent('WD巡礼マップ - Wikidataによる巡礼ルート作成');
    // <!-- X (Twitter) シェアボタン -->
    // <a href="https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}"
    //   target="_blank" class="button-X"> X で共有
    // </a>

    let shareButtons = `
          <!-- Facebook シェアボタン -->
          <a href="https://www.facebook.com/sharer/sharer.php?u=https://wd-map.hozo.jp/qr.html?map-qr=${mapsurl}" target="_blank" class="button-FB">Facebookで共有</a>

          <!-- LINE シェアボタン -->
          <a href="https://social-plugins.line.me/lineit/share?url=https://wd-map.hozo.jp/qr.html?map-qr=${mapsurl}" target="_blank" class="button-LINE">LINEで共有</a>`;
    
    document.getElementById("shareButtons").innerHTML=shareButtons;
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

function setAreaLists(){
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

function getSelectedArea(){
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
    else if(!JpAreaSelect.disabled){
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