// Dictionary.init();
//

//
// document.querySelector('body').addEventListener('click', function (e) {
//   Dictionary.hideWindow();
// });
//
// document.addEventListener("click", function (e) {
//   if (e.target) {
//     switch (e.target.className) {
//       case "tr-search-wrapper":
//         Dictionary.hideSearch();
//         break;
//       case "tr-button":
//         e.preventDefault();
//         Dictionary.fetchData();
//         Dictionary.showPopup();
//         break;
//     }
//   }
// });
// document.addEventListener('keydown', function(e){
//     if (e.keyCode == 27) {
//       Dictionary.hideSearch();
//     }
//   }, false)
// document.addEventListener("keyup", function(e) {
//     if (e.keyCode == 27)  {
//         Dictionary.hideSearch();
//     } else if (e.ctrlKey && e.shiftKey && e.keyCode == 79) {
//         Dictionary.showSearch();
//     } else if (e.keyCode == 13 && e.target && e.target.className == 'tr-input-search' ) {
//         e.preventDefault();
//         Dictionary.setWord(e.target.value);
//         Dictionary.fetchData();
//         Dictionary.hideSearch();
//     }
// });
//
// document.querySelector('.tr-body').addEventListener('click', function (e) {
//   if (e.target) {
//     switch (e.target.className) {
//       case "tr-close":
//         Dictionary.hideWindow();
//         break;
//       case "syn":
//         e.preventDefault();
//         Dictionary.setWord(e.target.text);
//         Dictionary.fetchData();
//         break;
//     }
//   }
// })
let selectedWord;
let theme = 'dark';
const HIDE_BTN_SECOND = 4;

document.onmouseup = function (evt) {
    let selection;
    let s = document.getSelection(),
        bodyRect = document.body.getBoundingClientRect();
    if (s.rangeCount > 0) {
        r = s.getRangeAt(0);
        if (r && s.toString()) {
            let p = r.getBoundingClientRect();
            if (p.left || p.top) {
                selectedWord = s.toString();
                showButton(p.top - bodyRect.top - 30, p.right);
            }
        }
    }
};

function getSetting(key, callback, errorCallback) {
    chrome.storage.sync.get('sm_tr_settings', result => {
        if (result['sm_tr_settings'][key] !== undefined) {
            callback(result['sm_tr_settings'][key]);
        } else {
            errorCallback();
        }
    });
}


chrome.runtime.onMessage.addListener(function (req) {
    if (req.notFound) {
        hideLoading();
        hideButton();
    } else {
        Dictionary.showLoading();
        Dictionary.fetchData();
    }
});

function readFile(_path, _cb) {
    fetch(_path, {mode: 'same-origin'})   // <-- important
        .then(function (_res) {
            return _res.blob();
        })
        .then(function (_blob) {
            let reader = new FileReader();
            reader.addEventListener("loadend", function () {
                _cb(this.result);
            });
            reader.readAsText(_blob);
        });
}


function fetchData(selection, callback) {
    chrome.runtime.sendMessage({word: selection}, callback);
}


function next(elem) {
    do {
        elem = elem.nextSibling;
    } while (elem && elem.nodeType !== 1);
    return elem;
}

function toggleNext() {
    let nextElem = next(this);
    if (nextElem) {
        if (nextElem.style.display === 'none' || nextElem.style.display === '') {
            nextElem.style.display = 'block';
            this.id = 'opened-title';
        } else {
            nextElem.style.display = 'none';
            this.id = 'closed-title';
        }
    }
}

function makeList(elm, list, selector, title) {
    if (list === undefined) {
        return;
    }
    let titleElem = document.createElement('h6');
    let listElement = elm.querySelector(selector);
    listElement.innerHTML = '';
    titleElem.innerHTML = title;
    listElement.appendChild(titleElem);
    list.forEach(function (e, i) {
        let li = document.createElement('li');
        let anchor = document.createElement('a');
        anchor.href = '#';
        anchor.innerHTML = e;
        anchor.className = 'sm-tr-tag';
        anchor.addEventListener('click', function () {
            selectedWord = e;
            btnClick();
        });
        li.appendChild(anchor);
        listElement.appendChild(li);
    });
    return listElement;
}

function showPopup(result) {
    let elm = document.querySelector("#sm-dict-tr-main-template");

    // =============================================== WORD
    elm.querySelector('.tr-word').innerHTML = result.word + '<span class="sm-tr-pos">(' + result.pos + ')</span>';
    // =============================================== Pronunciation and phonetics
    let pronB = elm.querySelector('#sm-dict-british-pron');
    let pronA = elm.querySelector('#sm-dict-american-pron');
    pronB.querySelector('i').dataset.pron = result.pron.audio.British;
    pronB.querySelector('span').innerHTML = result.pron.phon.British;

    pronA.querySelector('i').dataset.pron = result.pron.audio.American;
    pronA.querySelector('span').innerHTML = result.pron.phon.American;

    // =============================================== DEFINITIONS
    let defs = elm.querySelector('.tr-defs');
    defs.innerHTML = '';
    result.defs.forEach(function (e, i) {
        let deftemplate = document.querySelector('#tr-defs-list-item-template');
        let clone = document.importNode(deftemplate.content, true);

        clone.querySelector('.tr-def').innerHTML = e.definition;

        let collList = clone.querySelector('.tr-coll-list');
        let exTitle = clone.querySelector('h6');
        if (result.defs[i]['collocations'] !== undefined) {
            let colls = result.defs[i]['collocations'];
            Object.keys(colls).forEach(function (k) {
                let cult = document.createElement('h6');
                cult.innerHTML = k;
                let cul = document.createElement('ul');
                colls[k].forEach(function (f) {
                    let cli = document.createElement('li');
                    cli.innerHTML = f;
                    cli.className = 'sm-tr-tag';
                    cul.appendChild(cli);
                });
                collList.appendChild(cult);
                collList.appendChild(cul);
            })
        }
        clone.querySelectorAll('h6').forEach(function (h) {
            h.id = 'closed-title';
            // if (!next(this).querySelectorAll('li').length){
            //     this.style.display = 'none';
            // }
            h.addEventListener('click', toggleNext);
        });
        if (result['defs'][i]['examples'] !== undefined) {
            result['defs'][i]['examples'].forEach(function (ex, i) {
                if (i > 2) {
                    return;
                }
                let exElm = document.createElement('li');
                exElm.innerHTML = ex;
                clone.querySelector('.tr-example-list').appendChild(exElm);
            });
        } else {
            exTitle.style.display = 'none';
        }
        defs.appendChild(clone);
    });

    // =============================================== SYNONYMS and ANTONYMS tabs
    makeList(elm, result['synonyms'], '.tr-syn-list', 'Synonyms');
    makeList(elm, result['related'], '.tr-related-list', 'Related Words');
    makeList(elm, result['antonyms'], '.tr-ant-list', 'Antonyms');
    makeList(elm, result['near_ant'], '.tr-rel-ant-list', 'Near Antonyms');

    elm.style.display = 'block';
}

function btnClick() {
    hideButton();
    hidePopup();
    showLoading();
    fetchData(selectedWord, function (result) {
        showPopup(result);
        hideLoading();
    });
}

readFile(chrome.extension.getURL("template.html"), function (_res) {
    let mainElem = createElementFromHTML(_res);
    mainElem.id = 'sm-' + theme + '-tr-wrapper';
    let main = mainElem.querySelector("#sm-dict-tr-main-template");
    main.addEventListener('click', function (e) {
        e.stopPropagation();
    });

    let btn = mainElem.querySelector('.sm-tr-selected-button');
    btn.style.backgroundPosition = "0% 0%";
    btn.style.backgroundRepeat = "no-repeat";
    btn.style.backgroundSize = "24px 24px";
    btn.style.backgroundImage = 'url("' + chrome.extension.getURL("icons/dictionary-32.png") + '")';
    btn.addEventListener('click', btnClick);

    let loading = mainElem.querySelector('.sm-tr-loading');

    let loadingImgURL = chrome.extension.getURL("icons/loading.gif");
    loading.style.backgroundImage = "url('" + loadingImgURL + "')";
    loading.style.backgroundPosition = "7px center";
    loading.style.backgroundRepeat = "no-repeat";
    loading.style.backgroundSize = "13px";
    loading.style.backgroundColor = "#2092cc";

    mainElem.querySelectorAll('.tr-pron i').forEach(function (e) {
        e.addEventListener('click', function () {
            (new Audio(this.dataset.pron)).play();
        })
    });

    document.querySelector('body').appendChild(mainElem);
});


function createElementFromHTML(htmlString) {
    let div = document.createElement('div');
    div.innerHTML = htmlString.trim();
    return div.firstChild;
}

document.querySelector('body').addEventListener('click', function (e) {
    hidePopup();
});

function hidePopup() {
    document.getElementById("sm-dict-tr-main-template").style.display = 'none';
}

function showButton(top, left) {
    let btn = document.querySelector('.sm-tr-selected-button');
    btn.style.top = top + "px";
    btn.style.left = left + "px";
    btn.style.display = "table-cell";

    setInterval(function () {
        hideButton();
    }, HIDE_BTN_SECOND * 1000);

}

function hideButton() {
    let btn = document.querySelector('.sm-tr-selected-button');
    btn.style.display = "none";
}

function showLoading() {
    let loading = document.querySelector('.sm-tr-loading');
    loading.style.display = "block";
}

function hideLoading() {
    let loading = document.querySelector('.sm-tr-loading');
    loading.style.display = "none";
}