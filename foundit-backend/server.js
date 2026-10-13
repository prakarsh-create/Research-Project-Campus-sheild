const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
const dataDirectory = path.join(__dirname, "data");
const itemsFile = path.join(dataDirectory, "items.json");
const usersFile = path.join(dataDirectory, "users.json");
const authSecret = process.env.AUTH_SECRET || "foundit-development-secret";
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());

app.get("/", (req, res) => {
    res.send("FoundIt Backend is Running!");
});

app.post("/api/auth/register", async (req, res, next) => {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) {
        return res.status(400).json({ error: "Name, email, and password are required." });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    try {
        const users = await readUsers();
        const normalizedEmail = email.trim().toLowerCase();
        if (users.some((user) => user.email === normalizedEmail)) {
            return res.status(409).json({ error: "An account with this email already exists." });
        }

        const user = {
            id: crypto.randomUUID(),
            name: name.trim(),
            email: normalizedEmail,
            password: hashPassword(password),
        };
        users.push(user);
        await writeUsers(users);
        res.status(201).json({ token: createToken(user.id), user: publicUser(user) });
    } catch (error) {
        next(error);
    }
});

app.post("/api/auth/login", async (req, res, next) => {
    const { email, password } = req.body;
    try {
        const users = await readUsers();
        const user = users.find((candidate) => candidate.email === email?.trim().toLowerCase());
        if (!user || !verifyPassword(password || "", user.password)) {
            return res.status(401).json({ error: "Invalid email or password." });
        }
        res.json({ token: createToken(user.id), user: publicUser(user) });
    } catch (error) {
        next(error);
    }
});

app.get("/api/auth/me", requireAuth, async (req, res, next) => {
    try {
        const users = await readUsers();
        const user = users.find((candidate) => candidate.id === req.userId);
        if (!user) return res.status(401).json({ error: "Account not found." });
        res.json(publicUser(user));
    } catch (error) {
        next(error);
    }
});

app.get("/api/items", requireAuth, async (req, res, next) => {
    try {
        const search = String(req.query.search || "").trim().toLowerCase();
        const status = String(req.query.status || "").trim();
        const sort = String(req.query.sort || "newest");
        const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
        const pageSize = Math.min(Math.max(Number.parseInt(req.query.pageSize, 10) || 5, 1), 20);
        let items = (await readItems()).filter((item) => item.userId === req.userId);

        if (search) {
            items = items.filter((item) =>
                [item.title, item.location, item.description].some((value) =>
                    String(value || "").toLowerCase().includes(search),
                ),
            );
        }
        if (status) items = items.filter((item) => item.status === status);
        if (req.query.type === "lost" || req.query.type === "found") {
            items = items.filter((item) => (item.type || "lost") === req.query.type);
        }

        items.sort((first, second) => {
            if (sort === "oldest") return Date.parse(first.created_at || 0) - Date.parse(second.created_at || 0);
            if (sort === "title-asc") return first.title.localeCompare(second.title);
            if (sort === "title-desc") return second.title.localeCompare(first.title);
            return Date.parse(second.created_at || 0) - Date.parse(first.created_at || 0);
        });

        const total = items.length;
        const totalPages = Math.max(Math.ceil(total / pageSize), 1);
        const safePage = Math.min(page, totalPages);
        const start = (safePage - 1) * pageSize;
        res.json({
            items: items.slice(start, start + pageSize),
            total,
            page: safePage,
            pageSize,
            totalPages,
        });
    } catch (error) {
        next(error);
    }
});

app.get("/api/items/:id/matches", requireAuth, async (req, res, next) => {
    try {
        const items = await readItems();
        const source = items.find(
            (item) => String(item.id) === req.params.id && item.userId === req.userId,
        );
        if (!source) return res.status(404).json({ error: "Item not found." });

        const sourceWords = searchableWords(source);
        const oppositeType = (source.type || "lost") === "found" ? "lost" : "found";
        const matches = items
            .filter((item) => item.userId !== req.userId && (item.type || "lost") === oppositeType)
            .map((item) => ({
                item,
                score: matchScore(sourceWords, searchableWords(item)),
            }))
            .filter((candidate) => candidate.score > 0)
            .sort((first, second) => second.score - first.score)
            .slice(0, 5)
            .map((candidate) => candidate.item);

        res.json(matches);
    } catch (error) {
        next(error);
    }
});

app.post("/api/items", requireAuth, upload.single("image"), async (req, res, next) => {
    const { title, location, description, type } = req.body;

    if (!title || !title.trim()) {
        return res.status(400).json({ error: "Item title is required." });
    }
    if (type && !["lost", "found"].includes(type)) {
        return res.status(400).json({ error: "Report type must be lost or found." });
    }

    try {
        const image = req.file
            ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
            : null;
        const items = await readItems();
        const item = {
            id: Date.now(),
            title: title.trim(),
            type: type || "lost",
            location: location?.trim() || "Location unspecified",
            description: description?.trim() || "No further details were provided.",
            status: "Searching",
            image,
            userId: req.userId,
            created_at: new Date().toISOString(),
        };
        items.unshift(item);
        await writeItems(items);
        res.status(201).json(item);
    } catch (error) {
        next(error);
    }
});

app.patch("/api/items/:id", requireAuth, upload.single("image"), async (req, res, next) => {
    const { title, location, description, status, type } = req.body;
    const allowedStatuses = ["Searching", "Match Found", "Reunited"];

    if (!title?.trim()) {
        return res.status(400).json({ error: "Item title is required." });
    }
    if (status && !allowedStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid item status." });
    }
    if (type && !["lost", "found"].includes(type)) {
        return res.status(400).json({ error: "Report type must be lost or found." });
    }

    try {
        const items = await readItems();
        const item = items.find(
            (currentItem) =>
                String(currentItem.id) === req.params.id && currentItem.userId === req.userId,
        );
        if (!item) return res.status(404).json({ error: "Item not found." });

        item.title = title.trim();
        item.type = type || item.type || "lost";
        item.location = location?.trim() || "Location unspecified";
        item.description = description?.trim() || "No further details were provided.";
        item.status = status || item.status;
        if (req.file) {
            item.image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
        }
        item.updated_at = new Date().toISOString();

        await writeItems(items);
        res.json(item);
    } catch (error) {
        next(error);
    }
});

app.delete("/api/items/:id", requireAuth, async (req, res, next) => {
    try {
        const items = await readItems();
        const itemIndex = items.findIndex(
            (item) => String(item.id) === req.params.id && item.userId === req.userId,
        );

        if (itemIndex === -1) {
            return res.status(404).json({ error: "Item not found." });
        }

        items.splice(itemIndex, 1);
        await writeItems(items);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "Images must be 5 MB or smaller." });
    }
    next(error);
});

app.use((error, req, res, next) => {
    console.error("API error:", error);
    res.status(500).json({ error: "The request could not be completed." });
});

const PORT = process.env.PORT || 5000;

async function readItems() {
    try {
        return JSON.parse(await fs.readFile(itemsFile, "utf8"));
    } catch (error) {
        if (error.code === "ENOENT") {
            await writeItems([]);
            return [];
        }
        throw error;
    }
}

async function writeItems(items) {
    await fs.mkdir(dataDirectory, { recursive: true });
    await fs.writeFile(itemsFile, JSON.stringify(items, null, 2));
}

async function readUsers() {
    try {
        return JSON.parse(await fs.readFile(usersFile, "utf8"));
    } catch (error) {
        if (error.code === "ENOENT") {
            await writeUsers([]);
            return [];
        }
        throw error;
    }
}

async function writeUsers(users) {
    await fs.mkdir(dataDirectory, { recursive: true });
    await fs.writeFile(usersFile, JSON.stringify(users, null, 2));
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
    const [salt, storedHash] = storedPassword.split(":");
    if (!salt || !storedHash) return false;
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(storedHash, "hex"));
}

function createToken(userId) {
    const payload = Buffer.from(JSON.stringify({
        userId,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })).toString("base64url");
    const signature = crypto.createHmac("sha256", authSecret).update(payload).digest("base64url");
    return `${payload}.${signature}`;
}

function requireAuth(req, res, next) {
    const token = req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : "";
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return res.status(401).json({ error: "Authentication required." });

    const expectedSignature = crypto.createHmac("sha256", authSecret).update(payload).digest("base64url");
    if (signature.length !== expectedSignature.length ||
        !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return res.status(401).json({ error: "Invalid authentication token." });
    }

    try {
        const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        if (!decoded.userId || decoded.expiresAt < Date.now()) {
            return res.status(401).json({ error: "Authentication token expired." });
        }
        req.userId = decoded.userId;
        next();
    } catch {
        return res.status(401).json({ error: "Invalid authentication token." });
    }
}

function publicUser(user) {
    return { id: user.id, name: user.name, email: user.email };
}

function searchableWords(item) {
    return new Set(
        `${item.title} ${item.location} ${item.description}`
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter((word) => word.length > 2),
    );
}

function matchScore(sourceWords, candidateWords) {
    let sharedWords = 0;
    sourceWords.forEach((word) => {
        if (candidateWords.has(word)) sharedWords += 1;
    });
    return sharedWords;
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});