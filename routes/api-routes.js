const db = require("../models");
const passport = require("../config/passport_config");

module.exports = function (app) {
    //ll routes handling functions are defined here

    app.post("/api/signup", checkNotAuthenticated, async function (req, res) {
        const { firstName, lastName, email, password, gender, country } = req.body;
        const result = await db.User.create({
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: password,
            gender: gender,
            country: country
        });
        const budgetResult = await db.Budget.bulkCreate([
            { category: "income", amount: 0, cadence: 52, UserId: result.dataValues.id },
            { category: "homeUtil", amount: 0, cadence: 52, UserId: result.dataValues.id },
            { category: "groceries", amount: 0, cadence: 52, UserId: result.dataValues.id },
            { category: "transport", amount: 0, cadence: 52, UserId: result.dataValues.id },
            { category: "entEatout", amount: 0, cadence: 52, UserId: result.dataValues.id }
        ]);


        const budgetDetailResult = await db.BudgetDetails.bulkCreate([
            { name: "salary", amount: 0, cadence: 52, UserId: result.dataValues.id, BudgetId: budgetResult.find(ele => ele.category === "income").id },
            { name: "rental", amount: 0, cadence: 52, UserId: result.dataValues.id, BudgetId: budgetResult.find(ele => ele.category === "income").id },
            { name: "otherIncome", amount: 0, cadence: 52, UserId: result.dataValues.id, BudgetId: budgetResult.find(ele => ele.category === "income").id },
            { name: "gasElecWater", amount: 0, cadence: 52, UserId: result.dataValues.id, BudgetId: budgetResult.find(ele => ele.category === "homeUtil").id },
            { name: "mortgage", amount: 0, cadence: 52, UserId: result.dataValues.id, BudgetId: budgetResult.find(ele => ele.category === "homeUtil").id },
            { name: "phoneInt", amount: 0, cadence: 52, UserId: result.dataValues.id, BudgetId: budgetResult.find(ele => ele.category === "homeUtil").id },
            { name: "huOther", amount: 0, cadence: 52, UserId: result.dataValues.id, BudgetId: budgetResult.find(ele => ele.category === "homeUtil").id },
            { name: "food", amount: 0, cadence: 52, UserId: result.dataValues.id, BudgetId: budgetResult.find(ele => ele.category === "groceries").id },
            { name: "groceriesOther", amount: 0, cadence: 52, UserId: result.dataValues.id, BudgetId: budgetResult.find(ele => ele.category === "groceries").id },
            { name: "publicTrans", amount: 0, cadence: 52, UserId: result.dataValues.id, BudgetId: budgetResult.find(ele => ele.category === "transport").id },
            { name: "fuelParkings", amount: 0, cadence: 52, UserId: result.dataValues.id, BudgetId: budgetResult.find(ele => ele.category === "transport").id },
            { name: "eatout", amount: 0, cadence: 52, UserId: result.dataValues.id, BudgetId: budgetResult.find(ele => ele.category === "entEatout").id },
            { name: "ent", amount: 0, cadence: 52, UserId: result.dataValues.id, BudgetId: budgetResult.find(ele => ele.category === "entEatout").id },
        ]);

        res.redirect("/login");
    });

    app.put("/api/updateBudgetDetails", checkAuthenticated, async function (req, res) {
        const userId = req.user.id;
        for (let [name, fields] of Object.entries(req.body)) {
            await db.BudgetDetails.update(
                {
                    amount: fields.amount,
                    cadence: fields.cadence,
                }, {
                where: {
                    name: name,
                    UserId: userId
                }
            });
        };
        res.status(200).end();
    })

    app.put("/api/updateBudget", checkAuthenticated, async function (req, res) {
        const userId = req.user.id;
        for (let [name, amount] of Object.entries(req.body)) {
            await db.Budget.update(
                {
                    amount: amount
                }, {
                where: {
                    category: name,
                    UserId: userId
                }
            });
        };
        res.status(200).end();
    })

    app.get("/api/getBudget", checkAuthenticated, async function (req, res) {
        const userId = req.user.id;
        console.log(req.user);
        const result = await db.Budget.findAll({ where: { UserId: userId } });
        res.json(result);
    })

    app.get("/api/getBudgetDetails", checkAuthenticated, async function (req, res) {
        const userId = req.user.id;
        const result = await db.BudgetDetails.findAll({ where: { UserId: userId } });
        res.json(result);
    })

    // expenses
    app.post("/api/newexpense", async (req, res) => {
        const userId = req.user.id;
        try {
            const { title, amount, date, category } = req.body;
            const data = await db.Expense.create({
                title: title,
                amount: amount,
                class: "necessary",
                date: date,
                BudgetId: category,
                UserId: userId
            })
            res.json(data);
            console.log(data);
        } catch (err) {
            console.log(err);
            res.status(500).end();
        }
    })

    app.put("/api/updateexpense", checkAuthenticated, async function (req, res) {
        const userId = req.user.id;
        const {id,title, amount, date, category, sentiment } = req.body;
        await db.Expense.update(
            {
                title: title,
                amount: amount,
                date:date,
                BudgetId: category,
                class: sentiment
            }, {
            where: {
                id: id
            }
        });
        res.status(200).end();
    })


    app.delete("/api/deleteexpense/:recordid",  checkAuthenticated, async function (req, res) {
        const recordId = req.params.recordid;
        try {
            const data = await db.Expense.destroy({
                where: {
                    id: recordId
                }
            })
            res.status(200).end();
        } catch (err) {
            console.log(err)
            res.status(500).end();
        }
    })

    app.post("/api/login", passport.authenticate(`local`, {
        successRedirect: `/index`,
        failureRedirect: `/`,
        failureFlash: true
    }), (req, res) => {
        res.json(req.user);
    });

    app.get("/api/logout", function (req, res) {
        req.logout();
        res.redirect("/");
    });



    app.get("/api/sentimentcounts", checkAuthenticated,async function (req, res) {
        const userId = req.user.id;
        try {
            const results = {
                necessary: 0,
                unnecessary: 0,
                regreted: 0
            };
            const data = await db.Expense.findAll({
                where: {
                    Userid: userId
                }
            })

            data.forEach(element => {
                results[element.class] += 1;
            });
            res.json(results);
        } catch (err) {
            console.log(err)
            res.status(500).end();
        }
    });

    function checkNotAuthenticated(req, res, next) {
        if (req.isAuthenticated()) {
            return res.redirect('/index')
        }
        next()
    };

    function checkAuthenticated(req, res, next) {
        if (req.isAuthenticated()) {
            return next()
        }
        res.redirect('/login')
    }
}