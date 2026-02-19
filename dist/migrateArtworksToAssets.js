"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// migration/migrateArtworksToAssets.ts
var firebase_admin_1 = require("firebase-admin");
firebase_admin_1.default.initializeApp({
// If running locally you may want to set credentials here.
});
var db = firebase_admin_1.default.firestore();
function migrate() {
    return __awaiter(this, void 0, void 0, function () {
        var artworksSnap, _i, _a, doc, old, mediaSetId, now, mediaset, images, _b, images_1, imgUrl, mediaId, mediaDoc;
        var _c, _d, _e, _f, _g, _h, _j, _k, _l;
        return __generator(this, function (_m) {
            switch (_m.label) {
                case 0: return [4 /*yield*/, db.collection('Artworks').get()];
                case 1:
                    artworksSnap = _m.sent();
                    console.log("Found ".concat(artworksSnap.size, " artworks to migrate."));
                    _i = 0, _a = artworksSnap.docs;
                    _m.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 9];
                    doc = _a[_i];
                    old = doc.data();
                    mediaSetId = db.collection('MediaSets').doc().id;
                    now = firebase_admin_1.default.firestore.Timestamp.now();
                    mediaset = {
                        id: mediaSetId,
                        title: (_c = old.title) !== null && _c !== void 0 ? _c : '',
                        description: (_d = old.description) !== null && _d !== void 0 ? _d : '',
                        ownerUID: (_e = old.ownerUID) !== null && _e !== void 0 ? _e : null,
                        ordering: (_f = old.ordering) !== null && _f !== void 0 ? _f : Date.now(),
                        createdAt: (_g = old.created_at) !== null && _g !== void 0 ? _g : now,
                        modifiedAt: (_h = old.modified_at) !== null && _h !== void 0 ? _h : now,
                        publishedAt: (_j = old.published_at) !== null && _j !== void 0 ? _j : now,
                        deletedAt: (_k = old.deleted_at) !== null && _k !== void 0 ? _k : null,
                    };
                    return [4 /*yield*/, db.collection('MediaSets').doc(mediaSetId).set(mediaset)];
                case 3:
                    _m.sent();
                    images = Array.isArray(old.images) ? old.images : [];
                    _b = 0, images_1 = images;
                    _m.label = 4;
                case 4:
                    if (!(_b < images_1.length)) return [3 /*break*/, 7];
                    imgUrl = images_1[_b];
                    mediaId = db.collection('Media').doc().id;
                    mediaDoc = {
                        id: mediaId,
                        mediaSetId: mediaSetId,
                        type: 'image',
                        storagePath: '', // unknown
                        paths: {
                            original: imgUrl,
                            derivatives: {},
                        },
                        downloadURL: imgUrl,
                        createdAt: (_l = old.created_at) !== null && _l !== void 0 ? _l : now,
                        modifiedAt: now,
                        processed: false,
                    };
                    return [4 /*yield*/, db.collection('Media').doc(mediaId).set(mediaDoc)];
                case 5:
                    _m.sent();
                    _m.label = 6;
                case 6:
                    _b++;
                    return [3 /*break*/, 4];
                case 7:
                    console.log("Migrated artwork ".concat(doc.id, " -> mediaset ").concat(mediaSetId));
                    _m.label = 8;
                case 8:
                    _i++;
                    return [3 /*break*/, 2];
                case 9:
                    console.log('Migration done.');
                    return [2 /*return*/];
            }
        });
    });
}
migrate().catch(function (err) {
    console.error(err);
    process.exit(1);
});
