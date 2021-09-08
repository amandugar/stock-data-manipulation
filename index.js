const csv = require("csv-parser");
const dequeue = require("double-ended-queue");
const fs = require("fs");
const jsonexport = require("jsonexport");

const results = [];

fs.createReadStream("Book1.csv")
  .pipe(csv())
  .on("data", (data) => results.push(data))
  .on("end", () => {
    getData(results);
  });

const getData = (array) => {
  let finalArray = [];
  let indicesArray = [];
  let last = 0;
  for (let i = 0; i < array.length - 1; i++) {
    if (array[i]["Scrip Name"] == array[i + 1]["Scrip Name"]) {
      continue;
    } else {
      indicesArray.push({
        start: last,
        end: i + 1,
      });
      last = i + 1;
    }
  }
  indicesArray.push({ start: last, end: array.length });
  indicesArray.forEach((element) => {
    insertToArray(array, finalArray, element.start, element.end);
  });
  jsonexport(finalArray, function (err, csv) {
    if (err) return console.error(err);
    fs.writeFileSync("data.csv", csv);
  });
};

const addToArray = (finalArray, currSale, currPurchase, qty) => {
  let temp = {
    Scripcd: currPurchase["Scripcd"],
    ScripName: currPurchase["Scrip Name"],
    purchaseDate: currPurchase["Date"],
    saleDate: currSale["Date"],
    qty,
    purchaseAmount: currPurchase["Buy Net Rate"],
    saleAmount: currSale["Sale Net Rate"],
  };
  finalArray.push(temp);
};

const insertToArray = (array, finalArray, start, end) => {
  let purchase = new dequeue([]);
  let sale = new dequeue([]);
  for (let i = start; i < end; i++) {
    if (array[i]["Buy Qty"]) {
      purchase.push(array[i]);
    } else if (array[i]["Sale Qty"]) {
      sale.push(array[i]);
    }
  }

  while (!sale.isEmpty() && !purchase.isEmpty()) {
    let currSale = sale.peekFront();
    let currPurchase = purchase.peekFront();
    purchase.shift();
    sale.shift();
    if (parseInt(currSale["Sale Qty"]) === parseInt(currPurchase["Buy Qty"])) {
      addToArray(finalArray, currSale, currPurchase, currSale["Sale Qty"]);
    } else if (
      parseInt(currPurchase["Buy Qty"]) > parseInt(currSale["Sale Qty"])
    ) {
      let netQty =
        parseInt(currPurchase["Buy Qty"]) - parseInt(currSale["Sale Qty"]);
      addToArray(finalArray, currSale, currPurchase, currSale["Sale Qty"]);
      currPurchase["Buy Qty"] = netQty;
      purchase.unshift(currPurchase);
    } else {
      let netQty =
        parseInt(currSale["Sale Qty"]) - parseInt(currPurchase["Buy Qty"]);
      addToArray(finalArray, currSale, currPurchase, currPurchase["Buy Qty"]);
      currSale["Sale Qty"] = netQty;
      sale.unshift(currSale);
    }
  }
};
