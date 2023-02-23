AOS.init();
var isOpenMobileMenu = false;
let messageGatewayOpened = false;
const slider_elem = document.getElementById("interval");

let cachedExchangeTimes = [];

document.getElementById("menu-icon").addEventListener("click", () => {
  document.getElementById("mobile-menu").style.display = isOpenMobileMenu
    ? "none"
    : "flex";
  isOpenMobileMenu = !isOpenMobileMenu;
});

// START -> FETCH BLOG POSTS
async function getBlogPosts(limit = 0) {
  const response = await fetch(
    "https://api.rss2json.com/v1/api.json?rss_url=https://medium.com/feed/@l3a"
  );
  const blogPosts = await response.json();
  return blogPosts.items?.slice(0, limit) ?? [];
}

function extractDescription(content) {
  const paragraphs = content.match(/<p>.*?<\/p>/gs);
  const firstParagraph = paragraphs?.[0].replace("<p>", "").replace("</p>", "");
  const charactersLength = 150;
  const description = firstParagraph?.trim().slice(0, charactersLength);
  return description ?? "";
}

function createPostCard({ title, content, thumbnail, link }, sourcePath) {
  return `<div class="col-md-4 mb-5">
            <div class="update-card">
              <div class="image-wrapper">
                <img src="${thumbnail}" />
              </div>
              <div class="p-4 flex-grow-1 d-flex flex-column">
                <h3 class="title">
                  <a href="${link}" style="text-decoration: none;" target="_blank">${title}</a>
                </h3>
                <p class="small flex-grow-1">
                  ${extractDescription(content)}...
                </p>
                <a href="${link}" style="text-decoration: none;" target="_blank">
                  <img
                    class="arrow-icon"
                    src="${sourcePath}/assets/images/arrow-right.svg"
                    alt="arrow-right"
                  />
                </a>
              </div>
            </div>
          </div>`;
}

async function initBlogPosts() {
	const posts = await getBlogPosts(3);
	const postsWrapperElem = document.querySelector(".posts-wrapper");
	const sourcePath = postsWrapperElem ? postsWrapperElem.getAttribute('data-source-path') : "";
	const postsStr = posts.map((post) => createPostCard(post, sourcePath)).join("");
	postsWrapperElem.innerHTML = postsStr;
}

initBlogPosts();
// END -> FETCH BLOG POSTS

// realtime data transfer : https://l3a.gitbook.io/l3-atom-v3-documentation/streaming-service/websocket-api
// START -> REALTIME TRANSFER DATA
const initRealtimeData = () => {
  const streamWrapperElem = document.getElementById("stream-wrapper");
 
  const LIMIT_LIST_ITEM_ELEM = 21;

  const onSubscribe = (frequency = 1) => {
    let payload = {
      "action": "subscribe",
      "channel": "all",
      "frequency": frequency
    }
    const subscribePayload = JSON.stringify(payload);
    socket.send(subscribePayload);
  }

  const socket = new WebSocket("wss://ws.shared.projectx.network/");

  socket.onopen = (e) => {
    messageGatewayOpened = true
    onSubscribe(Number(slider_elem.value) ?? 1);
  };

  const isOnChain = (transfer) => {
    return 'value' in transfer && "blockTimestamp" in transfer;
  }

  const isValidTransfer = (transfer) => {
    return 'price' in transfer && "size" in transfer && "side" in transfer;
  }

  slider_elem.addEventListener('change', () => {
    onSubscribe(Number(slider_elem.value) ?? 1);
    messageGatewayOpened = true;
  })

  const processMessage = async (transfers = {}) => {

    if(transfers?.data?.length) {
      const transfer = transfers?.data[0];

      const currentListTransferElem = streamWrapperElem.childNodes.length;

      if (currentListTransferElem > LIMIT_LIST_ITEM_ELEM) {
        streamWrapperElem.childNodes[0].remove();
      }

      // const transfer = transfers.data[i];
      const itemElem = document.createElement("span");
      itemElem.classList.add("stream-item");
      

      const symbol = transfers?.symbol?.split('.');
      const time = new Date(transfer?.event_timestamp ?? transfer?.blockTimestamp).toLocaleTimeString('it-IT');
      const second = new Date(transfer?.event_timestamp ?? transfer?.blockTimestamp).getSeconds();
      const slider = Number(slider_elem?.value) ?? 1;
      if(!cachedExchangeTimes.includes(time)) {
        let type = '';
        switch(transfer.side) {
          case 'buy':
            type = 'Buy';
            break;
          case 'sell':
            type = 'Sell';
            break;
          default:
            break;
        }

        let transferText = [];

        if(isOnChain(transfer)) {
          transferText  = [
            `<span class="exchange-time">${time} </span>`,
            `<span class="exchange-size">${+transfer.value / 1e18} </span>`,
            `<span class="exchange-first-symbol">Hash: ${transfer.transactionHash} </span>`,
            `<span class="exchange-second-symbol">From: ${transfer.fromAddr} </span>`,
            `<span class="exchange-text">To: ${transfer.toAddr}</span>`,
          ]
        } else if(isValidTransfer(transfer)) {
          const exchange = transfers.exchange?.replace(/^(\w)(.+)/, (match, p1, p2) => p1.toUpperCase() + p2.toLowerCase());
          transferText = [
           `<span class="exchange-time">${time} </span>`,
           `<span class="exchange-size">${transfer.size} </span>`,
           `<span class="exchange-first-symbol">${symbol?.[0]} </span>`,
           `<span class="exchange-second-symbol">(${transfer.price} ${symbol?.[1]}) </span>`,
           `<span class="exchange-text">${type} in ${transfers.symbol} at ${exchange}</span>`,
         ];
        } else {
          return;
        }

        let timer;
        const speed = slider / 100;
        const onSetTimeout = (i) => {
          itemElem.innerHTML += transferText[i];
          if (i < transferText.length - 1) {
            timer = setTimeout(() => {
              onSetTimeout(i + 1);
            }, speed);
          } else {
            clearTimeout(timer);
          }
        }
        onSetTimeout(0);

        streamWrapperElem.appendChild(itemElem);
        
        if(cachedExchangeTimes.length > (slider / 10)) {
          cachedExchangeTimes = [];
        }
      }

      cachedExchangeTimes.push(time);

      // socket.close();

    }
    if(messageGatewayOpened === false){
      onSubscribe(slider);
      messageGatewayOpened = true;
    }
  };

  socket.onmessage = async (event) => {
    const data = JSON.parse(event.data);

    const transfers = data || {};

    await processMessage(transfers);
  };

  socket.onclose = (event) => {

  };

  socket.onerror = (error) => {
    console.log(`[error]`);
  };
};

initRealtimeData();
// END -> REALTIME TRANSFER DATA

