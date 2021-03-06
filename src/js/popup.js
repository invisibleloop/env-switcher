function URLSwitcher() {

}

URLSwitcher.HTTP_PROTOCOL = 'http://';
URLSwitcher.HTTPS_PROTOCOL = 'https://';
URLSwitcher.FTP_PROTOCOL = 'ftp://';
URLSwitcher.SFTP_PROTOCOL = 'sftp://';

URLSwitcher.supportedProtocols = [
  URLSwitcher.HTTP_PROTOCOL,
  URLSwitcher.HTTPS_PROTOCOL,
  URLSwitcher.FTP_PROTOCOL,
  URLSwitcher.SFTP_PROTOCOL,
];

URLSwitcher.ColourList = [
  {
    name: 'black',
    hex: '#000000',
  },
  {
    name: 'blue',
    hex: '#3498db',
  },
  {
    name: 'red',
    hex: '#c0392b',
  },
  {
    name: 'orange',
    hex: '#e67e22',
  },
  {
    name: 'concrete',
    hex: '#95a5a6',
  },
  {
    name: 'green',
    hex: '#27ae60',
  },
  {
    name: 'yellow',
    hex: '#f1c40f',
  }
];


URLSwitcher.DEFAULT_PROTOCOL = URLSwitcher.HTTP_PROTOCOL;
URLSwitcher.DEFAULT_LABEL_COLOR = '#000000';
URLSwitcher.prototype = Object.create(Object.prototype);
URLSwitcher.constructor = URLSwitcher;

URLSwitcher.activeLabelColor = URLSwitcher.DEFAULT_LABEL_COLOR;
URLSwitcher.tabs = [];

URLSwitcher.getCurrentTabUrl = callback => {
  const queryInfo = {
    active: true,
    currentWindow: true,
  };

  chrome.tabs.query(queryInfo, tabs => {
    let tab = tabs[0];
    let url = tab.url;
    let id = tab.id;
    let index = tab.index;
    callback(url, id, index);
  });
};

URLSwitcher.getallTabs = () => {
  const queryInfo = {
    windowId: chrome.windows.WINDOW_ID_CURRENT
  };

  chrome.tabs.query(queryInfo, tabs => {
    URLSwitcher.tabs = tabs;
  });
};

URLSwitcher.getModel = (url, label, labelColor) => {
  return {
    id: URLSwitcher.generateUUID(),
    url: url ? url : '',
    label: label ? label : '',
    labelColor: labelColor ? labelColor : URLSwitcher.DEFAULT_LABEL_COLOR,
  };
};

URLSwitcher.bindLabelColorEvents = () => {
  const elements = document.querySelectorAll('.js-color-touch');
  elements.forEach((element) => element.addEventListener('click', () => {
    let style = (window.getComputedStyle(element, false));
    URLSwitcher.activeLabelColor = style.backgroundColor;
  }));
};

URLSwitcher.checkServerStatus = (item) => {
  const env = item;
  let url = env.url;
  if (!url.match(/^[a-zA-Z]+:\/\//)) {
    url = `http://${url}`;
  }
  return new Promise((resolve) => {
    const ping = new XMLHttpRequest();
    ping.timeout = 5000;
    ping.onreadystatechange = function(){
      if(ping.readyState === 4){
          if(ping.status === 200){
            resolve({success: true});
          } else {
            resolve({success: false});
          }
      }
    }
    ping.open("GET", url, true);
    ping.send();
  });
};

URLSwitcher.updateSwitcherItem = (id, itemElement) => {
  chrome.storage.sync.get('data', data => {
    data.data.forEach(item => {;
      if (item.id === id) {
        item.label = itemElement.querySelector('.js-switcher-label').innerText;
        item.url = itemElement.querySelector('.js-switcher-url').innerText;
        item.labelColor = itemElement.querySelector('.js-switcher-tab').style.backgroundColor;
        let links = itemElement.querySelectorAll('.js-link');
        links.forEach(element => element.dataset.url = item.url);
      }
    });
    chrome.storage.sync.set(data);
  });
};

URLSwitcher.attachEvents = () => {

  let switcherItems = document.querySelectorAll('.js-switcher-item');
  switcherItems.forEach(switcherItem => {
    let id = switcherItem.id;

    let itemColourTab = switcherItem.querySelector('.js-switcher-tab');
    itemColourTab.addEventListener('click', () => URLSwitcher.displayColours(id, switcherItem));

    let itemLabel = switcherItem.querySelector('.js-switcher-label');
    itemLabel.addEventListener('input', () => URLSwitcher.updateSwitcherItem(id, switcherItem));

    let itemUrl = switcherItem.querySelector('.js-switcher-url');
    itemUrl.addEventListener('input', () => URLSwitcher.updateSwitcherItem(id, switcherItem));
  });

  let links = document.querySelectorAll('.js-link');
  links.forEach(link => {
    link.addEventListener('click', e => {
      let dataUrl = link.dataset.url;
      let dataTab = link.dataset.tab;

      URLSwitcher.getCurrentTabUrl((url, id, index) => {
        let currentUrl = url.replace(/^.*\/\/[^\/]+/, '');
        if (!URLSwitcher.hasSupportedProtocol(dataUrl)) {
          dataUrl = URLSwitcher.addDefaultProtocol(dataUrl);
        }
        if (dataTab === 'active') {
          chrome.tabs.update(id, {url: dataUrl + currentUrl});
        } else {
          chrome.tabs.create({url: dataUrl + currentUrl, index: index+1});
        }
        window.close();
      });
      e.preventDefault();
    });

    let tabs = document.querySelectorAll('.tabs__item--active');
    tabs.forEach(tab => {
      let tabIndex = parseInt(tab.dataset.index);
      tab.addEventListener('click', e => {
        chrome.tabs.highlight({tabs:tabIndex});
        e.preventDefault();
      });
    });
  });

  let urls = document.querySelectorAll('.js-switcher-url');
  urls.forEach(urls => {

  });

  let deleteBtn = document.querySelectorAll('.js-delete');
  deleteBtn.forEach(deleteBtn => {
    deleteBtn.addEventListener('click', e => {
      let dataId = deleteBtn.dataset.id;

      URLSwitcher.deleteItem(dataId);

      e.preventDefault();
    });
  });

  const optionTabs = document.querySelectorAll('.js-options');
  const optionsSections = document.querySelectorAll('.options-section');
  optionTabs.forEach(optionBtn => {
    optionBtn.addEventListener('click', (e) => {
      let target = e.currentTarget;
      let option = target.dataset.options;
      optionsSections.forEach(s => {
        s.classList.remove('open');
      });
      optionTabs.forEach(o => {
        o.classList.remove('btn--active');
      });
      if (option === 'import') {
        chrome.storage.sync.get('data', data => {
          const envData = data;
          const json = JSON.stringify(envData);
          const blob = new Blob([json], {type: "application/json"});
          const url  = URL.createObjectURL(blob);
          let downloadLink = document.querySelector('.js-export-link');
          downloadLink.download = `switcher-data-${URLSwitcher.randomString(5)}.json`;
          downloadLink.href = url;
        });
      }
      target.classList.add('btn--active');
      document.querySelector(`[data-section="${option}"]`).classList.add('open');
    }, false);
  });

  const importBtn = document.querySelector('.js-import');

  importBtn.addEventListener('click', () => {
    const files = document.getElementById('selectFiles').files;
    if (files.length <= 0) {
      return false;
    }
    let fr = new FileReader();
    fr.onload = function(e) {
      const result = JSON.parse(e.currentTarget.result);
      chrome.storage.sync.set({ data: result.data});
      URLSwitcher.buildUI(result.data);
    }
    fr.readAsText(files.item(0));
  }, false);

};

URLSwitcher.buildUI = collection => {

  if (typeof collection !== 'undefined') {
    let elem = document.querySelector('.js-environments');
    let list = [];

    collection.forEach((item) => {
      let tabs = [];
      let activeCount = 0;
      let tabClass = '';
      let serverStatus = 'fa-spinner fa-spin';

      URLSwitcher.tabs.forEach((tab, tabIndex) => {
        let tabUrl = tab.url + '';
        tabUrl = tabUrl.replace(/(^\w+:|^)\/\//, '');
        let url = item.url;
        let active = (tabUrl.startsWith(url)) ? ' tabs__item--active' : '';
        let indexTab = `data-index="${ tabIndex }"`;
        let tabText = (tabUrl.startsWith(url)) ? '&bull;' : '&nbsp;';
        if (tabUrl.startsWith(url)) {
          activeCount++;
          tabClass = ' switcher--tabs';
        }
        tabs.push(`<span class="tabs__item${ active }" ${ indexTab }>${ tabText }</span>`);
      });

      let tabGroup = tabs.join('');

      list.push(`<div class="switcher js-switcher-item ${ tabClass }" id="${ item.id }" data-color="${ item.labelColor }">`);
      if (activeCount > 0) {
        list.push(`<div class="tabs">${ tabGroup }</div>`);
      }

      let colorsMarkup = [
        `<span class="color__list js-color-list">`,
        URLSwitcher.ColourList.map((color) => {
          return `<span class="color__item js-color-item ${ color.name }" data-color="${ color.hex }" style="background-color: ${ color.hex };" data-id="${ item.id }"></span>`;
        }).join(''),
        `</span>`
      ].join('');

      list.push(
        `<div class="switcher__item switcher__item--label">
            ${ colorsMarkup }
            <span class="switcher__tab js-switcher-tab" style="background-color: ${ item.labelColor };" id="${ item.id }">
            </span>
            <span class="switcher__label js-switcher-label" contenteditable>${ item.label }</span> <br />
            <span class="switcher__url js-switcher-url" contenteditable>${ item.url }</span>
        </div>`
      );
      list.push(`<div class="switcher__item switcher__item--btn"><span class="switcher__status"><i class="js-server fa ${serverStatus}" aria-hidden="true" id="server-${ item.id }"></i></span></div>`);
      list.push(`<div class="switcher__item switcher__item--btn"><button class="switcher__link btn js-link" data-url="${ item.url }" data-tab="active">active tab</button></div>`);
      list.push(`<div class="switcher__item switcher__item--btn"><button class="switcher__link btn js-link" data-url="${ item.url }" data-tab="new">new tab</button></div>`);
      list.push(`<div class="switcher__item switcher__item--btn"><button class="switcher__link btn btn--delete js-delete" data-id="${ item.id }" data-tab="new">&times;</button></div>`);
      list.push('</div>');

    });

    elem.innerHTML = list.join('');
    let colorNodes = elem.querySelectorAll('.js-color-item');
    colorNodes.forEach(node => {
      node.addEventListener('click', () => {
        URLSwitcher.chooseColor(node);
        URLSwitcher.closeColorLists();
      });
    });

    const serverNodes = document.querySelectorAll('.js-server');
    collection.forEach((item) => {
      const server = URLSwitcher.checkServerStatus(item).then((data) => {
        const serverStatus = (data.success) ? 'fa-arrow-up' : 'fa-arrow-down' ;
        const elemServer = document.getElementById(`server-${item.id}`);
        elemServer.classList.remove('fa-spin');
        elemServer.classList.remove('fa-spinner');
        elemServer.classList.add(serverStatus);
      });
    });

    URLSwitcher.attachEvents();

  } else {
    chrome.storage.sync.set({ data: []});
  }

  document.querySelector('.open-label').style.display = (collection.length > 0) ? 'block' : 'none';

};


URLSwitcher.hasSupportedProtocol = (url) => {
  return URLSwitcher.supportedProtocols.find(protocol => {
    return url.indexOf(protocol) > -1;
  }) || false;
};

URLSwitcher.addDefaultProtocol = (url) => {
  return URLSwitcher.DEFAULT_PROTOCOL + url;
};

URLSwitcher.generateUUID = () => {
    let d = new Date().getTime();
    let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        let r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
};

URLSwitcher.randomString = (length) => {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
};

URLSwitcher.deleteItem = (uuid) => {
    chrome.storage.sync.get('data', data => {
      let filteredData = data.data.filter(item => {
        if (item.id !== uuid) {
          return item;
        }
      });
      chrome.storage.sync.set({data: filteredData}, () => {
        URLSwitcher.buildUI(filteredData);
      });
    });
};

URLSwitcher.closeColorLists = () => {
  const lists = document.querySelectorAll('.js-color-list');
  lists.forEach( node => {
    node.classList.remove('color__list--show');
  });
};

URLSwitcher.displayColours = (id, item) => {
  URLSwitcher.closeColorLists();
  let node = item.querySelector('.js-color-list');
  node.classList.add('color__list--show');
};

URLSwitcher.chooseColor = (colorNode) => {
  let itemNode = document.getElementById(colorNode.dataset.id);
  itemNode.dataset.color = colorNode.dataset.color;
  let tabColor = itemNode.querySelector('.js-switcher-tab');
  tabColor.style.backgroundColor = colorNode.dataset.color;
  URLSwitcher.updateSwitcherItem(itemNode.id, itemNode);
};

document.addEventListener('DOMContentLoaded', () => {
  URLSwitcher.getallTabs();

  chrome.storage.sync.get('data', data => URLSwitcher.buildUI(data.data || []));

  let addBtn = document.querySelectorAll('.js-form-btn')[0];
  addBtn.addEventListener('click', e => {
    let url = document.getElementById('url');
    let label = document.getElementById('label');
    if (url.value !== '' && label.value !== '') {
      chrome.storage.sync.get('data', data => {
        let dataStore = data.data || [];
        let colors = document.querySelectorAll('[name="colour"]');
        dataStore.push(URLSwitcher.getModel(
          url.value,
          label.value,
          URLSwitcher.activeLabelColor
        ));
        chrome.storage.sync.set({data: dataStore});
        URLSwitcher.buildUI(dataStore);
        url.value = '';
        label.value = '';
        colors[0].checked = true;
        URLSwitcher.activeLabelColor = URLSwitcher.DEFAULT_LABEL_COLOR;
      });
    }
    e.preventDefault();
  }, false);

  chrome.storage.onChanged.addListener(changes => {
  });
  URLSwitcher.bindLabelColorEvents();
  document.body.addEventListener('click',(e) => {
    URLSwitcher.closeColorLists();
  }, true);
});
