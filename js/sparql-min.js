/*
 * endpointで指定されたSPARQLエンドポイントにクエリを送信
 */
function sendQuery(endpoint, sparql) {
	const url = endpoint + "?" + "query="+encodeURIComponent(sparql)+"&output=json"
	const headers = {
		Accept: 'application/sparql-results+json'
	}
	return fetch(url, {
		method: 'GET',
		headers,
		mode: 'cors',
		cache: 'no-cache',
	});
}

/*
 * endpointで指定されたSPARQLエンドポイントにクエリを送信
 */
async function sendSPARQLQuery(endpoint,options){
    try {
		const result = await sendQuery(endpoint,options);
        if (!result.ok) {
			alert("SPARQLクエリのエラーが発生しました");
			removeSearchIng();
            return null;
        }		
        const resultData = await result.json();	
        console.log(resultData);

		return resultData;
    } catch (e) {
            alert(e.message);
        throw e;
    }
}


/* ------------------------------
 Loading イメージ表示関数
 ------------------------------ */
 function dispLoading(msg){
	// 引数なし（メッセージなし）を許容
	if( msg == undefined ){
	msg = "処理中...";
	}
	// 画面表示メッセージ
	var dispMsg = "<div class='loadingMsg'>" + msg + "</div>";
	// ローディング画像が表示されていない場合のみ出力
	if(document.getElementById("loading") == null){
	document.body.insertAdjacentHTML('afterbegin',"<div id='loading'>" + dispMsg + "</div>");
	}
   }
	
   /* ------------------------------
	Loading イメージ削除関数
	------------------------------ */
   function removeLoading(){
	document.getElementById("loading").remove();
   }


function getHtmlData(val){
	if(val.startsWith('http://www.wikidata.org/entity/')){//wd:XX
		return getLinkURL(val);
		// return '<a href="'+val.replace('http://','https://') + '" target="_blank">'+
		// 	'wd:'+val.replace('http://www.wikidata.org/entity/','')+'</a>';
	}
	else if(val.startsWith('http://www.wikidata.org/prop/direct/')){//wdt:XX
		return '<a href="'+val.replace('http://','https://') + '" target="_blank">'+
			'wdt:'+val.replace('http://www.wikidata.org/prop/direct/','')+'</a>';
	}
	else if(val.startsWith('http')){//URL
		if(val.toUpperCase().match(/\.(jpg)$/i)
			|| val.toUpperCase().match(/\.(png)$/i)
			|| val.toUpperCase().match(/\.(jpeg)$/i)
			|| val.toUpperCase().match(/\.(gif)$/i)
			|| val.toUpperCase().match(/\.(svg)$/i)){
				return '<img src="'+val +'" width="100"/>';
		}
		else{
			return '<a href="'+val.replace('http://','https://') +'" target="_blank">'+val+'</a>';
		}
	}
		
	return val;
}

/*
 * クエリ結果の表示処理[指定したデータの詳細表示用]
 */
function showResultDetails(resultData,resultArea,props){
	//表示するプロパティの順番を設定
	let propLen = 0;
	if(props!=null){
		propLen = props.length;	
	} 
	const data = resultData.results.bindings;
	const len = data.length;

	if(len==0){
		resultArea.innerHTML = "検索結果なし";
		return;
	}

	let rownum = [];
	let rowprop = [];
	// rownum[0] = 1;
	// rowprop[0] = data[0]['p'].value;
	for(let i= 0 ;i<len;i++){
		rowprop[i] = data[i]['p'].value;
		if(i==0){
			rownum[0] = 1;
		}
		else if(data[i]['p'].value == data[i-1]['p'].value){
			rownum[i] = 0;
			for(let j=i;j>=0;j--){
				if(rownum[j]>0){
					rownum[j]++;
					break;
				}
			}
		}
		else{
			rownum[i] = 1;
		}
	}
	// for(var i = 0; i < rownum.length; i++) {
	// 	　console.log(rowprop[i] +'='+rownum[i]);
	// 	}

	//ラベル,説明,上位クラス
	let labelText = "";
	let altLabelText = "";
	let descText = "";
	let subCls = "";
	let insOf = "";
	
	//順番を指定したプロパティ用
	let texts = [];
	for(let j=0 ;j<propLen;j++){
		texts.push('');
	}

	//その他用
	let otherText = "";
	
	//見出し語部分	
	if(data[0]['item']!=null){
		labelText += '<h2 class="details-title">'+data[0]['itemLabel'].value
			+'<br><font size="3">（Wikidata ID:<a href="'+data[0]['item'].value.replace('http://','https://')
			+'" target="_blank">'
            +data[0]['item'].value.replace('http://www.wikidata.org/entity/',"")
            +'</a>）</font></h2>';
	}

	labelText += '<table class="result-table">' ;
		
	for(let i=0 ;i<len;i++){
		let prop = data[i]['p'].value.replace("http://www.wikidata.org/prop/direct/","wdt:");
		if(prop.endsWith("rdf-schema#label")){
			labelText += showData(data[i],rownum[i]);
		}
		else if(prop.endsWith("core#altLabel")){
			altLabelText += showData(data[i],rownum[i]);
		}
		else if(prop.endsWith("schema.org/description")){
			descText += showData(data[i],rownum[i]);
		}
		else if(prop.endsWith("P279")){
			subCls += showData(data[i],rownum[i]);
		}
		else if(prop.endsWith("P31")){
			insOf += showData(data[i],rownum[i]);
		}
		//wdt:以外のプロパティは表示しない【暫定処理】
		else if(prop.startsWith("wdt:")){
			let sw = true;
			for(let j=0 ;j<propLen;j++){
				if(prop.endsWith(props[j])){	
					texts[j] += showData(data[i],rownum[i]);
					sw = false;
					break;
				}
			}
			if(sw){
				otherText += showData(data[i],rownum[i]);
			}
		}
	}

	// labelText += "</table>\n" ;

	let mesText = labelText + altLabelText + descText +"</table><hr>";

	if(""!=(subCls+insOf)){
		mesText += '<table class="result-table">'+subCls + insOf +"</table><hr>";
	}

	let propText = "";
	for(let j=0 ;j<propLen;j++){
		propText += texts[j];
	}

	if(otherText!=""){
		otherText = '<table class="result-table">' + otherText +"</table>";	
	}

	//表示するプロパティを指定している場合は，「すべて表示」ボタンでの制御を追加
	if(propText!=""){
		mesText += '<table class="result-table">'+propText +"</table><hr>";
		mesText +='<input type="button" id="show_other" value="▼すべて表示" onclick="showOther()">'
					+'<input type="button" id="hide_other"'
				+' style="display: none;" value="▲表示を減らす" onclick="hideOther()"><br>'
		mesText += '<div id="other_prop" style="display: none;" >'+otherText+'</div>';
	}
	else{
		mesText += otherText;
	}

	console.log(mesText);

	resultArea.innerHTML = mesText;
}

//セルの立て結合を考慮した処理
function showData(data_i,rownum){
	var mesText = "" ;
	let prop = "";
	let object = "";
	let lang ="";

	if(data_i['oLabel']['xml:lang'] != null){
		lang += ' (' +data_i['oLabel']['xml:lang'] + ')';
	}
	else if(data_i['itemLabel']['xml:lang'] != null){
		lang += ' (' +data_i['itemLabel']['xml:lang'] + ')';
	}

	if(data_i['propLabel']!=null){//wdt:XXXの述語処理
		prop = '<b>'+data_i['propLabel'].value + '</b>'
		             +'['+ data_i['prop'].value.replace('http://www.wikidata.org/entity/','wdt:') +']';
		

		if(data_i['o'].value.startsWith('http://www.wikidata.org/entity/')){//目的語がwd:XX
			const qid = data_i['o'].value.replace('http://www.wikidata.org/entity/','wd:');
			object += '<b>'+ data_i['oLabel'].value + '</b>' +
					'<a href="'+detail_html+'?key='+qid+ '">'+
					'['+qid+']</a>';
		}
		else if(data_i['o'].value.startsWith('http')){//目的語がURL
			if(data_i['o'].value.endsWith('.jpg')
				|| data_i['o'].value.endsWith('.JPG')
				|| data_i['o'].value.endsWith('.png')
				|| data_i['o'].value.endsWith('.svg')
				|| data_i['o'].value.endsWith('.jpeg')){
					object += '<img src="'+data_i['o'].value +'" width="180">'+'</img>';
			}
			else{
				object += '<a href="'+data_i['o'].value.replace('http://','https://') 
				        +'" target="_blank">'+ data_i['oLabel'].value+'</a>';
				}
		}
		else{//目的語がそれ以外
			object += data_i['oLabel'].value;
			if(data_i['oLabel']['xml:lang'] != null){
				object += ' (' +data_i['oLabel']['xml:lang'] + ')';
			}
			if(data_i['o'].datatype != null){
				object += ' ('
					   + data_i['o'].datatype.replace('http://www.w3.org/2001/XMLSchema#','xsd:')
					                         .replace('http://www.opengis.net/ont/geosparql#','geo:')
				       + ')';
			}
		}	
	}
	else if(data_i['p'].value.startsWith('http://www.wikidata.org/prop/direct-normalized/')){
		if(data_i['o'].value.startsWith('http')){//目的語がURL
			prop = data_i['p'].value.replace('http://www.wikidata.org/prop/direct-normalized/','wdtn:');
			object = '<a href="'+data_i['o'].value.replace('http://','https://') 
						+'" target="_blank">'+ data_i['oLabel'].value+'</a>';
		}
		else{
			prop = data_i['p'].value;
			object = data_i['oLabel'].value+'</a>';
		}
	}
	else if(data_i['p'].value=="http://www.w3.org/2000/01/rdf-schema#label"){
		prop = '<b>名前</b>';
		object = data_i['oLabel'].value+ lang ;
	}
	else if(data_i['p'].value=="http://www.w3.org/2004/02/skos/core#altLabel"){
		prop = '<b>別名</b>';
		object = data_i['oLabel'].value+ lang ;
	}
	else if(data_i['p'].value=="http://schema.org/description"){
		prop ='<b>説明</b>';
		object = data_i['oLabel'].value+ lang ;
	}
	// else{//wdt:XXX以外の述語の処理【検討中】
	// 	mesText += data_i['p'].value+' - '+
	// 				data_i['oLabel'].value+'<br>';
	// }

	//フォーマット調整【検討中】
	// mesText = mesText.replace('-01-01T00:00:00Z','');//日付について「年のみ」の場合は不要部分を削除
	// mesText = mesText.replace('T00:00:00Z','');//日付について「年月日のみ」の場合は不要部分を削除

	//return mesText;
	if(rownum>1){
		return '<tr><th rowspan="'+rownum+'">'+ prop + '</th><td>'+ object +'</td></tr>';
	}
	else if(rownum==0){
		return '<tr><td>'+ object +'</td></tr>';
	}
	else{
		return '<tr><th>'+ prop + '</th><td>'+ object +'</td></tr>';
	}
}


/*
 * 詳細表示へのリンク用URLの取得
 */
function getLinkURL(val){
	let key = val;
    if(val.startsWith('http://www.wikidata.org/entity/')){//wd:XX
        key = 'wd:'+val.replace('http://www.wikidata.org/entity/','');
		
	}
    return '<a href="javascript:ShowDetails('+"'"+"details.html"+'?key='+ key +"'"+ ');">'+ key+'</a>';
}

/* 
 * 詳細を別ウィンドウに表示する 
 */
function ShowDetails(page) {
	let lw = window.innerWidth - 400;
	let y = window.screenY + 100;

	if(lw<0){lw=100;}
	// window.open(page,"DetailsWin","left=400,top=200,width=400,height=600,scrollbars=1");
	window.open(page,"DetailsWin","left="+lw+",top="+y+",width=400,height=600,scrollbars=1");
	}

/* 
 * 検索中...アニメーションの表示
 */
function showSearchIng(resultArea){
	const orgDiv = resultArea.innerHTML;
	resultArea.innerHTML=orgDiv+'<div id="searching"><h2>検索中...</h2>'
	   + '<div class="flower-spinner"><div class="dots-container">'
	   +'<div class="bigger-dot"><div class="smaller-dot"></div>'
	   +'</div></div></div>'+'<br></div>' ;
}
function removeSearchIng(){
	const searchingDiv = document.getElementById("searching");
	if(searchingDiv!=null){
		searchingDiv.innerHTML="";
	}
}
/*
 * WikiMedia APIを使ってIDを取得
 *   KGSearchForWD(https://kgs.hozo.jp/)のKGSearch.jsより必要な関数を使用
 */
let offset = 0; 
let contQueryIds = false; //「続きを検索」の表示が必要か？[APIでIDsを取得した際]
let contQuery = false; //「続きを検索」の表示が必要か？[SPARQL用]

/*
 * GETでAPIにクエリ送信
 */
function sendGetQuery(endpoint, options) {
	var url = endpoint + options +"&origin=*";

	const headers = {
		Accept: 'application/results+json'
	}
	return fetch(url, {
		method: 'GET',
		// headers,
		cache: 'no-cache',
  	});
}

async function getWdIDs(label){
	return getWdIDsByWM(label,50);
}

async function getWdID(label){
	return getWdIDsByWM(label,1);
}
async function getWdIDsByWM(label,limit){
    const endpoint ="https://www.wikidata.org/w/api.php";
    const options  = "?action=query&list=search&srsearch="+label+"&srlimit="+limit+"&sroffset="+offset+"&format=json";
    try {
		const result = await sendGetQuery(endpoint,options);
        if (!result.ok) {
			console.log("WikiMedia APIでのクエリエラーが発生しました");
            return;
        }		
        const resultData = await result.json();	
        console.log(resultData);

		const data = resultData.query.search;
		let ids = new Array();
		for(let i = 0; i < data.length; i++){
			// ids.push(data[i].id);
			ids.push(data[i].title);			
		}
		return ids;
    } catch (e) {
            alert(e.message);
        throw e;
    }
}

//WikiMedia APIを使ってIDを取得【wbsearchentities】
//こちらは「前方一致」のみ？
async function getWdIDsBySE(label){
	return getWdIDsByMEse(label,50);
}

async function getWdIDse(label){
	return getWdIDsByMEse(label,1);
}

async function getWdIDsByMEse(label,limit){
    const endpoint ="https://www.wikidata.org/w/api.php"; 
    const options ="?action=wbsearchentities&search="+label+"&language=en&limit="+limit+"&continue="+offset+"&format=json";
    try {
		const result = await sendGetQuery(endpoint,options);
        if (!result.ok) {
			console.log("WikiMedia API【wbsearchentities】のクエリエラーが発生しました");
            return;
        }		
        const resultData = await result.json();	
        console.log(resultData);

		const data = resultData.search;
		let ids = new Array();
		for(let i = 0; i < data.length; i++){
			ids.push(data[i].id);
		}
		return ids;
    } catch (e) {
            alert(e.message);
        throw e;
    }
}
