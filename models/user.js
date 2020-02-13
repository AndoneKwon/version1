module.exports = (sequelize, DataTypes)=>(
    sequelize.define('user',{
        email :{
            type : DataTypes.STRING(30),
            allowNull : false,
            unique : true,
        },
        
        password : {
            type : DataTypes.STRING(100),
            allowNull : true,
        },

        salt : {
            type : DataTypes.STRING(64),
            allowNull : false,
        },

        nickname : {
            type : DataTypes.STRING(40),
            allowNull : false,
        },

    
    },
    
        {
            timestamps : true,
            paranoid : true,
        }

    
    )

);