//jshint esversion:6

const express = require('express')
const bodyParser = require('body-parser')
const dotenv = require('dotenv')
let ejs = require('ejs')

const app = express();
app.use(express.static('front-end'))
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended:true}));



// CONFIGURING .ENV
dotenv.config({path:'./config/config.env'})

const pool = require('./config/db')




var user
var cus_id
var c_id //cart id




app.get("/",(req, res) => {
    res.sendFile( __dirname + "/front-end/login.html");
})


app.post("/login", (req,res) => {
  let username = req.body.username;
  let passwd = req.body.password;
  // console.log(username);
  pool.query('SELECT * FROM customer', (error, results) => {
    if (error) {
      throw error
    }
    // console.log(results.rows);
    var name=[]
    for(var i = 0 ;i < results.rowCount;i++)
    {
      name.push(results.rows[i].email);
    }
    // console.log(name);
    let flag = 0;
    for(var i = 0;i<name.length;i++)
    {
      if(username === name[i])
      {
        // console.log("Username is a valid");
        user = username
        flag = 1
      }
    }
    pool.query('select * from customer where email=$1',[user],(error,result)=>{
      if(error){
        throw error
      }
      // console.log(result.rows)
      for(var i = 0 ;i < result.rowCount;i++)
      {
        cus_id = result.rows[i].customer_id;
        c_id = result.rows[i].cart_id;
      }
      // console.log(cus_id,c_id,user)
    })



    if(flag === 0)
    {
      console.log("not a valid user");
      res.redirect("/")
    }
    else {
      pool.query('select password from customer where email=$1',[user],(error,results)=>{
        if(error){
          throw error
        }
        if(passwd === results.rows[0].password)
        {
          res.redirect("/home")
        }
        else{
          res.redirect("/")
        }
      })
    }

  })


})

app.get("/home",(req,res) => {

  // res.sendFile( __dirname + "/front-end/home.html");
  pool.query('SELECT * FROM product', (error, results) => {
    if (error) {
      throw error
    }
    // console.log(results.rows);
    var name = []
    var cost = []
    var type = []
    var quantity = []
    var count = results.rowCount;
    // console.log(count);
    for(var i=0;i<count;i++)
    {
      name.push(results.rows[i].name);
      type.push(results.rows[i].type);
      cost.push(results.rows[i].cost);
      quantity.push(results.rows[i].quantity);
    }
    // console.log(name,cost,quantity)

    res.render('home',{count1 : count,productname:name,producttype:type,productcost:cost,productstock:quantity});

  })



})

app.get("/register",(req,res) => {
  res.sendFile( __dirname + "/front-end/register.html");
})

app.post("/register",(req,res) => {
  let name = req.body.name;
  let email = req.body.email;
  let address = req.body.address;
  let phone = req.body.phone;
  let password = req.body.password;
  let cart_id = []
  var id
  pool.query('select cart_id from cart', (error, results) => {
    if (error) {
      throw error
    }
    for(var i =0;i<results.rowCount;i++)
    {
      cart_id.push(results.rows[i].cart_id);
    }
    if(cart_id.length === 0)
    {
        id = 1001;
    }
    else
    {
      id = cart_id[cart_id.length - 1] + 1;
    }
    // console.log(cart_id)
    // console.log(id)
    pool.query('CALL cart_insert($1)',[id],(error, results) => {
      if (error) {
        throw error
      }
    })

    pool.query('insert into customer(name,email,address,phone_no,password,cart_id) values($1,$2,$3,$4,$5,$6)',[name,email,address,phone,password,id],(error, results) => {
      if (error) {
        throw error
      }
     })
  })

  // console.log(name,email,address,phone,password);


  res.redirect("/")

})
app.post("/delete_item",(req,res)=>{
  let cart
  pool.query('select cart_id from customer where email=$1',[user],(error,results)=>{
    if(error){
      throw error;
    }
    cart=results.rows[0].cart_id
    pool.query('CALL delete_cart_item($1)',[cart],(error,results)=>{
      if(error){
        throw error
      }
      res.redirect("/home")
    })
  })
})

app.post("/addtocart",(req,res)=>{
  var product_name = req.body.cartitem;
  pool.query('select product_id from product where name=$1',[product_name],(error, results) => {
    if (error) {
      throw error
    }
    var productid ;
    var pid=[]
    var cartid;
    for(var i =0;i<results.rowCount;i++)
    {
      productid = results.rows[i].product_id;
    }
    pool.query('select cart_id from customer where email=$1',[user],(error, result) => {
      if (error) {
        throw error
      }
      for(var i =0;i<result.rowCount;i++)
      {
        cartid = result.rows[i].cart_id;
        // console.log(cartid,result.rows[i].cart_id)
      }

      pool.query('select product_id from cart_item where cart_id=$1',[cartid],(error, results)=>{
        if(error){
          throw error
        }
        for(var i =0;i<results.rowCount;i++)
        {
          pid.push(results.rows[i].product_id);
        }
        flag = 0
        for(var i=0;i<pid.length;i++)
        {
          if(productid == pid[i])
          {
            flag = 1
          }
        }

        // console.log(flag)
        if(flag === 1)
        {
          pool.query('CALL update_cart_item($1)',[productid],(error, results)=>{
            if(error){
              throw error
            }

          })
          res.redirect("/home")
        }
        else {
          pool.query('CALL insert_cart_item($1,$2,1)',[cartid,productid],(error, results) => {
            if (error) {
              throw error
            }
            })
            res.redirect("/home")
        }
      })

      // console.log(cartid,productid,user);


    })

  })

})

app.get("/cart",(req,res)=>{
  pool.query('select p.name,p.type,c.quantity,p.cost cost_per_item,(c.quantity * p.cost) total_payable from product p join cart_item c on p.product_id=c.product_id and c.cart_id in (select cart_id from customer where email=$1)',[user],(error, results) => {
    if (error) {
      throw error
    }
    // console.log(user)
    // console.log(results.rows)
    res.render('cart',{count : results.rowCount, result : results.rows})
  })
})



app.post("/payment",(req,res)=>{
  // console.log(cus_id,c_id,user)
  var t_amount = req.body.total_amount
  if(req.body.hasOwnProperty("total_amount")){
    pool.query('insert into payment(customer_id,cart_id,total_amount,payment_status) values($1,$2,$3,FALSE)',[cus_id,c_id,t_amount],(error, results) => {
      if (error) {
        throw error
      }
      // console.log("Inserted successfully")
  })
 }
  res.redirect("/payments");
})

app.get("/payments",(req,res)=>{
  pool.query('select * from payment where customer_id = $1 AND payment_status = FALSE AND payment_id=(select MAX(payment_id) from payment)',[cus_id],(error, results)=>{
    if (error){
      throw error
    }
    //  console.log(results.rows)
    res.render("payment",{count : results.rowCount,result : results.rows})
  })
})

app.post("/order_placed",(req,res)=>{
  let id=req.body.Pay
  let cart=0
  let pid=[]
  let quant=[]
  pool.query('update payment set payment_status=TRUE where payment_id=$1',[id],(error,results)=>{
    if(error){
      throw error
    }
    pool.query('select cart_id from payment where payment_id=$1',[id],(error,results)=>{
      if(error){
        throw error
      }
      cart=results.rows[0].cart_id
      pool.query('select product_id,quantity from cart_item where cart_id=$1',[cart],(error,results)=>{
        if(error){
          throw error
        }
        //console.log(results.rows)
        for(let i=0;i<results.rowCount;i++)
        {
          pid.push(results.rows[i].product_id)
          quant.push(results.rows[i].quantity)
          //console.log(pid[i])
        }
        for(let i=0;i<results.rowCount;i++)
        {
          pool.query('update product set quantity=quantity-$1 where product_id=$2',[quant[i],pid[i]],(error,results)=>{
            if(error){
              throw error
            }
          })
        }
      })
      pool.query('CALL delete_cart_item($1)',[cart],(error,results)=>{
        if(error){
          throw error
        }
        res.redirect("/home")
      })
    })
  })
})

app.get("/profile", (req, res) => {
  pool.query('select name,address,phone_no from customer where email = $1',[user],(error, results)=>{
    if(error){
      throw error
    }
    //console.log(results.rows)
    res.render("profile",{name : results.rows[0].name,email : user,address : results.rows[0].address,phone : results.rows[0].phone_no});
  })


});




app.get("/your_orders",(req, res)=>{
  pool.query('select email,payment_status,total_amount from customer c,payment p  where c.customer_id=p.customer_id and p.payment_status=TRUE and c.email=$1',[user],(error,results)=>{
    if(error){
      throw error
    }
    res.render("orders",{count : results.rowCount,result : results.rows})
  })
})




app.listen(process.env.PORT || 3000, () => {
  console.log("Server started running !")
})
