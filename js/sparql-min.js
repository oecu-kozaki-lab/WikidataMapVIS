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
		return '<a href="'+val.replace('http://','https://') + '" target="_blank">'+
			'wd:'+val.replace('http://www.wikidata.org/entity/','')+'</a>';
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
