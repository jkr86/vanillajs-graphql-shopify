const API_PATH = "https://premier-robotic.myshopify.com/api/2022-07/graphql.json";
let CART_ID = null;
let GLOBAL_PRODUCTS = [];
const API_PAYLOAD = {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Shopify-Storefront-Access-Token": "9d31ab68ff6790b414f0bd33378f5f8f",
  },
  body: "",
};

// All GraphQL Queries
const ALL_PRODUCTS = `
query {
  products(first: 1) {
    edges {
      node {
        id
        title
        createdAt
        description
        variants(first: 1) {
          edges {
            node {
              id
              image{
                id
                url
              }
              priceV2 {
                amount
              }
            }
          }
        }
      }
    }
  }
}
`;

const CREATE_CART = `
mutation($merchandiseId:ID!){
  cartCreate(
    input: {
      lines: [
        {
          quantity: 1
          merchandiseId: $merchandiseId
        }
      ]
    }
  ) {
    cart {
      id
      createdAt
      updatedAt
      lines(first: 10) {
        edges {
          node {
            id
            merchandise {
              ... on ProductVariant {
                id
              }
            }
          }
        }
      }
      cost {
        totalAmount {
          amount
          currencyCode
        }
        subtotalAmount {
          amount
          currencyCode
        }
        totalTaxAmount {
          amount
          currencyCode
        }
        totalDutyAmount {
          amount
          currencyCode
        }
      }
    }
  }
}
  `;

const GET_CART = `
query($id:ID!) {
  cart(
    id: $id
  ) {
    id
    createdAt
    updatedAt
    lines(first: 10) {
      edges {
        node {
          id
          quantity
          merchandise {
            ... on ProductVariant {
              id
              title
            }
          }
        }
      }
    }
  }
}
  `;

const UPDATE_CART = `
mutation ($cartId:ID! $lineId:ID! $quantity:Int!){
  cartLinesUpdate(
    cartId: $cartId
    lines: {
      id: $lineId
      quantity: $quantity
    }
  ) {
    cart {
      id
      lines(first: 10) {
        edges {
          node {
            id
            quantity
            merchandise {
              ... on ProductVariant {
                id
              }
            }
          }
        }
      }
      cost {
        totalAmount {
          amount
          currencyCode
        }
        subtotalAmount {
          amount
          currencyCode
        }
        totalTaxAmount {
          amount
          currencyCode
        }
        totalDutyAmount {
          amount
          currencyCode
        }
      }
    }
  }
}`;

// -------------------------------------------------------------------------------------------

const cart = document.getElementById("cart");
const cartBtn = document.getElementById("cartBtn");
const cartIndicator = document.getElementById("cartNumber");
const cartStatus = document.getElementById("cartStatus");

//Get all products from shopify
const getProducts = async () => {
  return await fetch(API_PATH, {
    ...API_PAYLOAD,
    body: JSON.stringify({
      query: ALL_PRODUCTS,
    }),
  })
    .then((res) => res.json())
    .then((result) => result);
};

//Create a cart
const createCart = async (productId) => {
  return await fetch(API_PATH, {
    ...API_PAYLOAD,
    body: JSON.stringify({
      query: CREATE_CART,
      variables: {
        merchandiseId: productId,
      },
    }),
  })
    .then((res) => res.json())
    .then((result) => result);
};

// Get cart from shopify
const getCart = async (id) => {
  return await fetch(API_PATH, {
    ...API_PAYLOAD,
    body: JSON.stringify({
      query: GET_CART,
      variables: {
        id: id,
      },
    }),
  })
    .then((res) => res.json())
    .then((result) => result);
};

// Update quantity in the cart
const updateCart = async (cartId, cartLineId, amount) => {
  return await fetch(API_PATH, {
    ...API_PAYLOAD,
    body: JSON.stringify({
      query: UPDATE_CART,
      variables: {
        cartId: cartId,
        lineId: cartLineId,
        quantity: amount,
      },
    }),
  })
    .then((res) => res.json())
    .then((result) => result);
};

// -------------------------------------------------------------------------------------------

// Format cart data
const formatCartData = (data) => {
  let subTotal = document.getElementById("subTotal");
  let tax = document.getElementById("tax");
  let duty = document.getElementById("duty");
  let total = document.getElementById("total");
  subTotal.innerText = data.cost.subtotalAmount.amount;
  tax.innerText = data.cost.totalTaxAmount.amount;
  duty.innerText = data.cost.totalDutyAmount ? data.cost.totalDutyAmount.amount : 0;
  total.innerText = data.cost.totalAmount.amount;
};

// Add item to cart
const addToCart = (e) => {
  if (GLOBAL_PRODUCTS.length === 0) {
    cart.style.display = "block";
    let productVariantId = e.path[2].id;
    createCart(productVariantId).then((res) => {
      let cartData = res.data.cartCreate.cart;
      cartIndicator.innerText = cartData.lines.edges.length;
      cartStatus.style.display = "none";
      CART_ID = cartData.id;
      let items = cartData.lines.edges;
      getProducts().then((res) => {
        let products = res.data.products.edges;
        let foundProducts = items.map((item) => {
          return {
            ...products.find((product) => {
              return product.node.variants.edges.find((variant) => variant.node.id == item.node.merchandise.id);
            }),
            cartLineId: item.node.id,
          };
        });
        let productsPlace = document.getElementById("cartProducts");
        new Set(foundProducts).forEach((item) => {
          formatProduct(true, productsPlace, item);
          formatCartData(cartData);
        });
        GLOBAL_PRODUCTS = foundProducts;
      });
    });
  }
};

// Open cart
const openCart = () => {
  cart.style.display = "block";
  getCart(CART_ID).then((res) => {
    let items = res.data.cart.lines.edges;

    getProducts().then((res) => {
      let products = res.data.products.edges;
      let foundProducts = items.map((item) => {
        return {
          ...products.find((product) => {
            return product.node.variants.edges.find((variant) => variant.node.id == item.node.merchandise.id);
          }),
          cartLineId: item.node.id,
        };
      });
      let productsPlace = document.getElementById("cartProducts");
      new Set(foundProducts).forEach((item) => {
        let productExist = GLOBAL_PRODUCTS.find((product) => product.id === item.id);
        if (!productExist) formatProduct(true, productsPlace, item);
      });
      GLOBAL_PRODUCTS = foundProducts;
    });
  });
};

// Hide the cart overlay
const closeCart = () => {
  cart.style.display = "none";
};

// Format all products
const formatProduct = (isCart, source, item) => {
  let top = document.createElement("div");
  let image = document.createElement("img");
  let info = document.createElement("div");
  let title = document.createElement("h2");
  let price = document.createElement("h3");
  let cartBtn = document.createElement("button");
  top.id = isCart ? item.cartLineId : item.node.variants?.edges[0].node.id;
  top.classList.add("shadow-md", "rounded-md", "bg-white", "max-w-xs", "flex", "overflow-hidden", "relative", "my-4");
  image.src = item.node.variants?.edges[0]?.node.image.url;
  image.classList.add("w-24", "h-full");
  top.appendChild(image);
  info.classList.add("p-6", "w-full");
  top.appendChild(info);
  title.innerText = item.node.title;
  price.innerText = `Price: ${item.node.variants?.edges[0]?.node.priceV2.amount}`;
  cartBtn.classList.add("absolute", "right-0", "bottom-0", "text-xs", "text-gray-600", "hover:text-blue-500", "mr-2", "mb-2", "font-medium");
  cartBtn.id = "cartBtn";
  cartBtn.innerText = "Add to cart";
  cartBtn.addEventListener("click", addToCart);
  info.appendChild(title);
  info.appendChild(price);
  if (isCart) {
    handleQuantity(info);
  } else {
    info.appendChild(cartBtn);
  }
  source.appendChild(top);
};

//List all products
getProducts().then((res) => {
  let productsPlace = document.getElementById("products");
  let products = res.data.products.edges;
  products.forEach((item) => {
    formatProduct(false, productsPlace, item);
  });
});

// Add item to card
const increaseQuantity = (e) => {
  const quantity = document.getElementById("quantity");
  let cartLineId = e.path[3].id;
  updateCart(CART_ID, cartLineId, parseInt(quantity.value) + 1).then((res) => {
    let cartData = res.data.cartLinesUpdate.cart;
    formatCartData(cartData);
  });
  quantity.value = parseInt(quantity.value) + 1;
  // cartIndicator.innerText = parseInt(quantity.value);
};

// Remove item from cart
const decreaseQuantity = (e) => {
  const quantity = document.getElementById("quantity");
  if (quantity.value == 1) {
    quantity.value = 1;
    return;
  }
  let cartLineId = e.path[3].id;
  updateCart(CART_ID, cartLineId, parseInt(quantity.value) - 1).then((res) => {
    let cartData = res.data.cartLinesUpdate.cart;
    formatCartData(cartData);
  });
  quantity.value = parseInt(quantity.value) - 1;
  // cartIndicator.innerText=parseInt(quantity.value);
};

// Append quantity controls
const handleQuantity = (info) => {
  const btnContainer = document.createElement("div");
  btnContainer.classList.add("flex", "items-center", "space-x-1");
  const decreaseBtn = document.createElement("div");
  decreaseBtn.classList.add("w-4", "cursor-pointer");
  decreaseBtn.id = "decreaseQuantity";
  decreaseBtn.innerText = "-";
  const increaseBtn = document.createElement("div");
  increaseBtn.classList.add("w-4", "cursor-pointer");
  increaseBtn.id = "increaseQuantity";
  increaseBtn.innerText = "+";
  const quantity = document.createElement("input");
  quantity.classList.add("w-4");
  quantity.id = "quantity";
  quantity.value = 1;
  quantity.setAttribute("disabled", true);

  btnContainer.appendChild(decreaseBtn);
  btnContainer.appendChild(quantity);
  btnContainer.appendChild(increaseBtn);

  info.appendChild(btnContainer);

  decreaseBtn?.addEventListener("click", decreaseQuantity);
  increaseBtn?.addEventListener("click", increaseQuantity);
};

