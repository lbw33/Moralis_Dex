const serverUrl = "https://ttn4conzr0er.usemoralis.com:2053/server"; //Server url from moralis.io
const appId = "H8HJMkH38zNI5dyPqMZdzY4lecz2MqdcgqoQuTwO"; // Application id from moralis.io

let currentNetwork;
let ethNetwork = "eth";
let bscNetwork = "bsc";
let polygonNetwork = "polygon";
let currentTrade = {};
let currentSelectSide;
let tokens;

async function init() {
  await Moralis.start({ serverUrl, appId });
  await Moralis.enableWeb3();
  await listAvailableTokens(ethNetwork);
  currentUser = Moralis.User.current();
  console.log("Current User: " + currentUser);
  if (currentUser) {
    document.getElementById("swap_button").disabled = false;
  }
}

async function listAvailableTokens(network) {
  console.log("Network: " + network);
  currentNetwork = network;
  const result = await Moralis.Plugins.oneInch.getSupportedTokens({
    chain: currentNetwork, // The blockchain you want to use (eth/bsc/polygon)
  });
  tokens = result.tokens;
  let parent = document.getElementById("token_list");
  for (const address in tokens) {
    let token = tokens[address];
    let div = document.createElement("div");
    div.setAttribute("data-address", address);
    div.className = "token_row";
    let html = `
        <img class="token_list_img" src="${token.logoURI}">
        <span class="token_list_text">${token.symbol}</span>
        `;
    div.innerHTML = html;
    div.onclick = () => {
      selectToken(address);
    };
    parent.appendChild(div);
  }
}

function selectToken(address) {
  closeModal();
  console.log(tokens);
  currentTrade[currentSelectSide] = tokens[address];
  console.log(currentTrade);
  renderInterface();
  getQuote();
}

function renderInterface() {
  if (currentTrade.from) {
    document.getElementById("from_token_img").src = currentTrade.from.logoURI;
    document.getElementById("from_token_text").innerHTML =
      currentTrade.from.symbol;
  }
  if (currentTrade.to) {
    document.getElementById("to_token_img").src = currentTrade.to.logoURI;
    document.getElementById("to_token_text").innerHTML = currentTrade.to.symbol;
  }
}

async function login() {
  try {
    currentUser = Moralis.User.current();
    if (!currentUser) {
      currentUser = await Moralis.authenticate();
    }
    document.getElementById("swap_button").disabled = false;
  } catch (error) {
    console.log(error);
  }
}

function openModal(side) {
  currentSelectSide = side;
  document.getElementById("token_modal").style.display = "block";
}
function closeModal() {
  document.getElementById("token_modal").style.display = "none";
}

async function getQuote(currentNetwork) {
  if (
    !currentTrade.from ||
    !currentTrade.to ||
    !document.getElementById("from_amount").value
  )
    return;

  let amount = Number(
    document.getElementById("from_amount").value *
      10 ** currentTrade.from.decimals
  );

  const quote = await Moralis.Plugins.oneInch.quote({
    chain: currentNetwork, // The blockchain you want to use (eth/bsc/polygon)
    fromTokenAddress: currentTrade.from.address, // The token you want to swap
    toTokenAddress: currentTrade.to.address, // The token you want to receive
    amount: amount,
  });
  console.log(quote);
  // document.getElementById("from_token_price").innerHTML =
  //   quote.toTokenAmount / quote.fromTokenAmount;

  document.getElementById("gas_estimate").innerHTML = quote.estimatedGas;
  document.getElementById("to_amount").value =
    quote.toTokenAmount / 10 ** quote.toToken.decimals;
  console.log(quote);
}

async function trySwap(currentNetwork) {
  let address = Moralis.User.current().get("ethAddress");
  let amount = Number(
    document.getElementById("from_amount").value *
      10 ** currentTrade.from.decimals
  );
  if (currentTrade.from.symbol !== "ETH") {
    const allowance = await Moralis.Plugins.oneInch.hasAllowance({
      chain: currentNetwork, // The blockchain you want to use (eth/bsc/polygon)
      fromTokenAddress: currentTrade.from.address, // The token you want to swap
      fromAddress: address, // Your wallet address
      amount: amount,
    });
    console.log(allowance);
    if (!allowance) {
      await Moralis.Plugins.oneInch.approve({
        chain: currentNetwork, // The blockchain you want to use (eth/bsc/polygon)
        tokenAddress: currentTrade.from.address, // The token you want to swap
        fromAddress: address, // Your wallet address
      });
    }
  }
  try {
    let receipt = await doSwap(address, amount);
    alert("Swap Complete");
  } catch (error) {
    console.log(error);
  }
}

function doSwap(userAddress, amount, currentNetwork) {
  return Moralis.Plugins.oneInch.swap({
    chain: currentNetwork, // The blockchain you want to use (eth/bsc/polygon)
    fromTokenAddress: currentTrade.from.address, // The token you want to swap
    toTokenAddress: currentTrade.to.address, // The token you want to receive
    amount: amount,
    fromAddress: userAddress, // Your wallet address
    slippage: 1,
  });
}

init();
document.getElementById("ETH_button").onclick = listAvailableTokens(ethNetwork);
document.getElementById("BSC_button").onclick = listAvailableTokens(bscNetwork);
document.getElementById("POLY_button").onclick =
  listAvailableTokens(polygonNetwork);

document.getElementById("modal_close").onclick = closeModal;
document.getElementById("from_token_select").onclick = () => {
  openModal("from");
};
document.getElementById("to_token_select").onclick = () => {
  openModal("to");
};
document.getElementById("login_button").onclick = login;
document.getElementById("from_amount").onblur = getQuote(currentNetwork);
document.getElementById("swap_button").onclick = trySwap(currentNetwork);
