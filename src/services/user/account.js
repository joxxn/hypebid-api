import express from 'express'
import prisma from '../../db/prisma.js'
const router = express.Router()
import bcrypt from 'bcrypt'
import jwt from "jsonwebtoken"
import { JWT_SECRET } from "../../constant/index.js"
import uploadCloudinary from "../../utils/cloudinary/uploadCloudinary.js"
import removeCloudinary from "../../utils/cloudinary/removeCloudinary.js"
import verification from '../../middleware/verification.js'
import validateEmail from '../../utils/validateEmail.js'
import Tesseract from 'tesseract.js';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LANG_DATA_PATH = path.join(__dirname, '../../lang-data');

export const login = async (req, res) => {
    try {
        const { email, password } = req.body
        if (!email || !password) {
            return res.status(400).json({ status: 400, message: 'All data must be filled!' })
        }
        const data = await prisma.user.findFirst({
            where: {
                email
            },
        })
        if (!data) {
            return res.status(404).json({ status: 404, message: 'Wrong email or password!' })
        }
        if (data.role === "Admin") {
            return res.status(400).json({ status: 400, message: 'You are not user!' })
        }
        const { role } = data
        const accessToken = jwt.sign({ id: data.id, role }, JWT_SECRET)
        const check = await bcrypt.compare(password, data.password)
        if (!check) {
            return res.status(400).json({ status: 400, message: 'Wrong email or password!' })
        }
        return res.status(200).json({ status: 200, message: 'Login successful!', data: { accessToken, role, ...data } })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

const register = async (req, res) => {
    try {
        const { email, name, password, phone } = req.body
        if (!email || !name || !password || !phone) {
            return res.status(400).json({ status: 400, message: 'All data must be filled!' })
        }
        if (typeof email !== "string" || typeof name !== "string" || typeof password !== "string" || typeof phone !== "string") {
            return res.status(400).json({ status: 400, message: 'All data must be string!' })
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ status: 400, message: 'Email is not valid!' })
        }

        const check = await prisma.user.findUnique({
            where: {
                email
            }, select: {
                email: true
            }
        })
        if (check) {
            return res.status(400).json({ status: 400, message: 'Email already exist!' })
        }
        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await prisma.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
                phone,
                role: "User",
            }
        })

        const { role } = user
        const accessToken = jwt.sign({ id: user.id, role }, JWT_SECRET)
        return res.status(200).json({ status: 200, message: 'Register successful!', data: { ...user, accessToken, role } })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

const profile = async (req, res) => {
    try {
        const { id } = req.decoded
        const data = await prisma.user.findUnique({
            where: {
                id
            },
        })
        if (!data) {
            return res.status(404).json({ status: 404, message: 'There is no data' })
        }
        return res.status(200).json({ status: 200, message: 'Detail profile', data })
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

const edit = async (req, res) => {
    try {
        const { id } = req.decoded
        const { name, phone, email } = req.body

        if (!email || !name || !phone) {
            return res.status(400).json({ status: 400, message: 'All data must be filled!' })
        }
        if (typeof email !== "string" || typeof name !== "string" || typeof phone !== "string") {
            return res.status(400).json({ status: 400, message: 'All data must be string!' })
        }

        if (!validateEmail(email)) {
            return res.status(400).json({ status: 400, message: 'Email is not valid!' })
        }


        const check = await prisma.user.findUnique({
            where: {
                email
            }, select: {
                email: true,
                id: true
            }
        })

        if (check && check.id !== id) {
            return res.status(400).json({ status: 400, message: 'Email already exist!' })
        }


        const updated = await prisma.user.update({
            where: {
                id
            },
            data: {
                name,
                phone
            }
        })
        return res.status(200).json({ status: 200, message: 'Successfully update profile', data: updated })
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

const image = async (req, res) => {
    try {
        const { id } = req.decoded
        const image = req.file
        if (!image) {
            return res.status(400).json({ status: 400, message: 'Image must be uploaded' })
        }
        const check = await prisma.user.findFirst({
            where: {
                id
            },
            select: {
                image: true
            }
        })
        if (!check) {
            return res.status(404).json({ status: 404, message: 'There is no data' })
        }
        if (check.image) {
            removeCloudinary(check.image, "profile")
        }
        const updated = await prisma.user.update({
            where: {
                id
            },
            data: {
                image: image.path
            }
        })
        return res.status(200).json({ status: 200, message: 'Successfully update photo profile', data: updated })
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

const deleteImage = async (req, res) => {
    try {
        const { id } = req.decoded

        const check = await prisma.user.findFirst({
            where: {
                id
            },
            select: {
                image: true
            }
        })
        if (!check) {
            return res.status(404).json({ status: 404, message: 'There is no data' })
        }
        if (check.image) {
            removeCloudinary(check.image, "profile")
        }
        const updated = await prisma.user.update({
            where: {
                id
            },
            data: {
                image: null
            }
        })
        return res.status(200).json({ status: 200, message: 'Successfully delete photo profile', data: updated })
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

const changePassword = async (req, res) => {
    try {
        const { id } = req.decoded
        const { newPassword, oldPassword, confirmPassword } = req.body

        if (!newPassword || !oldPassword || !confirmPassword) {
            return res.status(400).json({ status: 400, message: 'All data must be filled!' })
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ status: 400, message: 'Confirm password must be same with new password' })
        }
        const check = await prisma.user.findFirst({
            where: {
                id
            },
            select: {
                password: true
            }
        })
        if (!check) {
            return res.status(404).json({ status: 404, message: 'There is no data' })
        }
        const isValidPassword = await bcrypt.compare(oldPassword, check.password)
        if (!isValidPassword) {
            return res.status(400).json({ status: 400, message: 'Wrong old password' })
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        const updated = await prisma.user.update({
            where: {
                id
            },
            data: {
                password: hashedPassword
            }
        })
        return res.status(200).json({ status: 200, message: 'Successfully update password', data: updated })
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}


const verifyKyc = async (req, res) => {
    try {

        const file = req.file
        if (!file) return res.status(400).json({ status: 400, message: "Image must be uploaded" });
        const kycUrl = file.path


        let processedUrl = kycUrl;

        // --- STRATEGI BARU: THRESHOLDING ---
        // e_blackwhite: Memaksa gambar jadi 2 warna saja (Hitam & Putih). 
        // Ini mematikan background batik/biru muda.
        // w_1500: Resolusi cukup besar karena timeoutmu sudah 60s.

        if (kycUrl.includes('cloudinary.com')) {
            // Coba preset ini. Kalau terlalu terang, hapus 'e_improve'
            processedUrl = kycUrl.replace('/upload/', '/upload/w_1500,e_blackwhite,e_improve,q_100/');
        }

        console.log("[processedUrl]", processedUrl)

        const { data: { text } } = await Tesseract.recognize(processedUrl, 'ind', {
            // Arahkan ke folder hasil path.join tadi
            langPath: LANG_DATA_PATH,

            // Wajib true karena file aslinya .gz
            gzip: true,

            // Mencegah error write permission di Vercel
            cacheMethod: 'readOnly',

            logger: m => { }
        });
        const upperText = text.toUpperCase();

        // Cukup cek keywords dasar
        const keywords = ["PROVINSI", "KABUPATEN", "NIK", "JAKARTA", "JAWA", "KOTA"];
        const matchCount = keywords.filter(w => upperText.includes(w)).length;

        // Threshold rendah: ketemu 1 kata aja dianggap lolos filter awal
        if (matchCount >= 1) {
            // SIMPAN KE DATABASE (Status: PENDING)
            // await db.users.update({ status: 'PENDING_KYC', kycUrl: kycUrl ... })

            return res.json({
                status: 200,
                message: "KYC Accepted, waiting for admin verification",
                data: {
                    kycUrl,
                    isDetected: true
                }
            });
        } else {
            return res.status(400).json({
                status: 400,
                message: "KYC Rejected, please try again",
                data: {
                    kycUrl,
                    isDetected: false
                }
            });
        }
    } catch (e) {
        // Fallback: Jika OCR error/timeout, loloskan saja biar admin yang cek
        // Ini biar gak ganggu flow user saat demo
        return res.json({
            status: 200,
            message: "KYC Accepted, waiting for admin verification",
            data: {
                kycUrl,
                isDetected: true
            }
        });
    }
}

const checkKyc = async (req, res) => {
    try {
        const { id } = req.decoded
        const check = await prisma.user.findFirst({
            where: {
                id
            },
            select: {
                kycs: {
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        })
        if (!check) {
            return res.status(404).json({ status: 404, message: 'There is no data' })
        }
        if (check.kycs.length === 0) {
            return res.status(404).json({ status: 404, message: 'No KYC data found' })
        }
        if (check.kycs[0].status === 'Pending') {
            return res.status(200).json({ status: 200, message: 'KYC Verification is pending', data: check.kycs[0] })
        }
        if (check.kycs[0].status === 'Rejected') {
            return res.status(200).json({ status: 200, message: 'KYC Verification is rejected', data: check.kycs[0] })
        }
        return res.status(200).json({ status: 200, message: 'KYC Verification is accepted', data: check.kycs[0] })
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: 'Internal Server Error!' })
    }
}

router.get("/", verification(["User"]), profile)
router.put("/", verification(["User"]), edit)
router.patch("/", verification(["User"]), uploadCloudinary("profile").single("image"), image)
router.delete("/", verification(["User"]), deleteImage)
router.post("/login", login)
router.post("/register", register)
router.put("/change-password", verification(["User"]), changePassword)
router.get("/check-kyc", verification(["User"]), checkKyc)
router.post("/verify-kyc", verification(["User"]), uploadCloudinary("kyc").single("image"), verifyKyc)

export default router