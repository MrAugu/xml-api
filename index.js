// const start  = async () => {
//     const ctx = await fetch("https://www.growtopiagame.com/forums/external.php?type=RSS2&forumids=43&lastpost=1").then(res => res.text());
//     console.log(xmlParser.toJson(ctx));
// }

// start();

// const clients = {
//   "dc019010": "XPGFR-1290102052245673",
//   "superuser": "mrbest1010"
// };

const fetch = require("node-fetch");
const xmlParser = require("xml2json");
const express = require("express");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const app = express();

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(helmet())

app.get("/xml-parser/growtopia-forums-rss", async (req, res) => {
  res.set("Content-Type", "application/json");
  const clientID = req.query.clientid;
  const secret = req.query.secret;
  const forum = req.query.forumid;
  const images = req.query.images || false;

  const ctx = await fetch(`https://www.growtopiagame.com/forums/external.php?type=RSS2&forumids=${forum}`).then(res => res.text());
  const json = JSON.parse(xmlParser.toJson(ctx));
  const payload = {
    code: 200,
    posts: []
  };

  for (var q = 0; q < json.rss.channel.item.length; q++) {
    var imgLinks = getAttrFromString(json.rss.channel.item[q]["content:encoded"], "img", "src");
    var decoded_content = json.rss.channel.item[q]["content:encoded"].replace(/<style([\s\S]*?)<\/style>/gi, "");
    decoded_content = decoded_content.replace(/<script([\s\S]*?)<\/script>/gi, "");
    decoded_content = decoded_content.replace(/<\/div>/ig, "\n");
    decoded_content = decoded_content.replace(/<\/li>/ig, "\n");
    decoded_content = decoded_content.replace(/<li>/ig, "  *  ");
    decoded_content = decoded_content.replace(/<\/ul>/ig, "\n");
    decoded_content = decoded_content.replace(/<\/p>/ig, "\n");
    decoded_content = decoded_content.replace(/<br\s*[\/]?>/gi, "\n");
    decoded_content = decoded_content.replace(/<[^>]+>/ig, "");
    decoded_content = decoded_content.replace(/(\r\n|\r|\n){2,}/g, "$1\n");
    decoded_content = decoded_content.replaceAll(":\n\n\t\n\t\t\n\t\t\n\t\t\t\n\t\t\t\t", " - ");
    decoded_content = decoded_content.replaceAll("\n\t\t\t\t\n\t\t\t\n\n\t\t\t", "\n\n");
    decoded_content = decoded_content.replaceAll("\n\n\t\t\t\n\t\t\n\t\n\n", "\n\n");
    decoded_content = escapeHtml(decoded_content);
    decoded_content = decoded_content.trim();

    if (imgLinks.length > 0 && images) {
        for (var i = 0; i < occurrences(json.rss.channel.item[q]["content:encoded"], "<img", false); i++) {
            decoded_content = decoded_content.replace(/<img([\s\S]*?)>/i, `!Image[${i}]`);
        }

    } else if (imgLinks.length > 0 && !images) {
        for (var i = 0; i < occurrences(json.rss.channel.item[q]["content:encoded"], "<img", false); i++) {
            decoded_content = decoded_content.replace(/<img([\s\S]*?)>/i, "");
        }
    }

    if (decoded_content.includes("Attached Images")) decoded_content = decoded_content.split("Attached Images")[0].trim();

    if (imgLinks.length > 0) {
        var links = [];
        for (var y = 0; i < imgLinks.length; i++) {
        if (!links.includes(imgLinks[y])) links.push(imgLinks[y]);
        }
        imgLinks = links;
    }

    var itemPayload = {};

    itemPayload["title"] = json.rss.channel.item[q].title;
    itemPayload["postedAt"] = json.rss.channel.item[q].pubDate;
    itemPayload["content"] = decoded_content;
    itemPayload["author"] = json.rss.channel.item[q]["dc:creator"];
    itemPayload["threadLink"] = json.rss.channel.item[q]["guid"]["$t"];
    itemPayload["postLink"] = json.rss.channel.item[q].link;

    payload["subforum"] = json.rss.channel.item[q].category["$t"];
    payload["subforumUrl"] = json.rss.channel.item[q].category.domain;
    
    if (images) {
      var imgs = {};

      for (var t = 0; t < imgLinks.length; t++) {
          imgs[t] = imgLinks[t];
      }

      itemPayload["images"] = imgs;
    }

    payload.posts.push(itemPayload);
  }

  payload["postCount"] = payload.posts.length;
  res.status(200).send(JSON.stringify(payload, null, 4));
});

app.listen(5051, () => {
  console.log("API Server running on port 5051.");
});

function getAttrFromString(str, node, attr) {
    var regex = new RegExp('<' + node + ' .*?' + attr + '="(.*?)"', "gi"), result, res = [];
    while ((result = regex.exec(str))) {
        res.push(result[1]);
    }
    return res;
}

function occurrences(string, subString, allowOverlapping) {

    string += "";
    subString += "";
    if (subString.length <= 0) return (string.length + 1);

    var n = 0,
        pos = 0,
        step = allowOverlapping ? 1 : subString.length;

    while (true) {
        pos = string.indexOf(subString, pos);
        if (pos >= 0) {
            ++n;
            pos += step;
        } else break;
    }
    return n;
}

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

function escapeHtml(unsafe) {
    return unsafe.replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&apos;/g, "'");
 }