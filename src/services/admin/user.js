import express from 'express'
import prisma from '../../db/prisma.js'
const router = express.Router()

const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                role: "User"
            },
            include: {
                kycs: {
                    orderBy: {
                        createdAt: "desc"
                    }
                },
                auctions: {
                    orderBy: {
                        createdAt: "desc"
                    }
                },
                transactions: {
                    orderBy: {
                        createdAt: "desc"
                    }
                }
            },
            orderBy: {
                name: "asc"
            }
        });

        for (const user of users) {
            const kyc = user.kycs[0] || null
            for (const transaction of user.transactions) {
                const expiredTime = new Date(transaction.createdAt)
                expiredTime.setDate(expiredTime.getDate() + 1)
                if (expiredTime < new Date() && transaction.status === "Pending") {
                    transaction.status = "Expired"
                }
            }
        }
        return res.status(200).json({ status: 200, message: "Success", data: users })
    } catch (error) {
        res.status(500).json({ status: 500, message: "Internal Server Error" })
    }
}

const getUser = async (req, res) => {
    const { id } = req.params
    try {
        const user = await prisma.user.findFirst({
            where: {
                id
            },
            include: {
                kycs: {
                    orderBy: {
                        createdAt: "desc"
                    }
                },
                auctions: {
                    orderBy: {
                        createdAt: "desc"
                    }
                },
                transactions: {
                    orderBy: {
                        createdAt: "desc"
                    }
                },
                bids: {
                    orderBy: {
                        createdAt: "desc"
                    }
                },
                withdraws: {
                    orderBy: {
                        createdAt: "desc"
                    }
                }
            }
        });
        if (!user) {
            return res.status(404).json({ status: 404, message: "User not found" })
        }

        for (const transaction of user.transactions) {
            const expiredTime = new Date(transaction.createdAt)
            expiredTime.setDate(expiredTime.getDate() + 1)
            if (expiredTime < new Date() && transaction.status === "Pending") {
                transaction.status = "Expired"
            }
        }

        user.kyc = user.kycs[0] || null

        return res.status(200).json({ status: 200, message: "Success", data: user })
    } catch (error) {
        res.status(500).json({ status: 500, message: "Internal Server Error" })
    }
}

const answerKycUser = async (req, res) => {
    try {
        const { id } = req.params
        const { status } = req.body
        if (!status) {
            return res.status(400).json({ status: 400, message: "Status is required" })
        }
        if (status != "Accepted" && status != "Rejected") {
            return res.status(400).json({ status: 400, message: "Status must be Accepted or Rejected" })
        }
        const user = await prisma.user.findFirst({
            where: {
                id
            },
            include: {
                kycs: {
                    orderBy: {
                        createdAt: "desc"
                    },
                    take: 1
                }
            }
        })
        if (!user) {
            return res.status(404).json({ status: 404, message: "User not found" })
        }
        if (user.kycs.length === 0) {
            return res.status(404).json({ status: 404, message: "No KYC data found" })
        }
        const kyc = user.kycs[0]
        if (kyc.status === "Accepted") {
            return res.status(400).json({ status: 400, message: "KYC already accepted" })
        }
        if (kyc.status === "Rejected") {
            return res.status(400).json({ status: 400, message: "KYC already rejected" })
        }
        const updatedKyc = await prisma.kyc.update({
            where: {
                id: kyc.id
            },
            data: {
                status: status
            }
        })
        return res.status(200).json({ status: 200, message: "Success", data: updatedUser })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ status: 500, message: "Internal Server Error" })
    }
}

const setUserStatus = async (req, res) => {
    const { id } = req.params
    try {
        const user = await prisma.user.findFirst({
            where: {
                id
            }
        });
        if (!user) {
            return res.status(404).json({ status: 404, message: "User not found" })
        }
        if (user && user.role === "Admin") {
            return res.status(400).json({ status: 400, message: "You are admin" })
        }
        const updatedUser = await prisma.user.update({
            where: {
                id
            },
            data: {
                banned: !user.banned,
            }
        })
        return res.status(200).json({ status: 200, message: updatedUser.banned ? "Successfull to activate user" : "Successfull to deactivate user", data: updatedUser })
    } catch (error) {
        console.log(error)
        res.status(500).json({ status: 500, message: "Internal Server Error" })
    }
}

router.get("/", getAllUsers)
router.get("/:id", getUser)
router.patch("/:id", setUserStatus)
router.patch("/:id/kyc", answerKycUser)

export default router