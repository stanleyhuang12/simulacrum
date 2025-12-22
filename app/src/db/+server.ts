import { json, error } from '@sveltejs/kit';
import { Sequelize, Model, DataTypes  } from "sequelize"; 
import type { ModelOptions } from "sequelize"; 
import { Deliberation } from "../models/+deliberations";


const DB_USER = import.meta.env.get('DB_USER')
const DB_PASS = import.meta.env.get('DB_PASS')
const DB_HOST = import.meta.env.get('DB_HOST')
const DB_NAME = import.meta.env.get('DB_NAME')

export const sequelize = new Sequelize(`postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}/${DB_NAME}`, 
    {
        dialect: "postgres", 
        logging: true
    }
);

async function initializeDatabase() {
    try { 
        const authenticated = await sequelize.authenticate(); 
        console.log(`PostgreSQL URI connection is sucessfully authenticated!`)
    } catch (err) {
        console.error(`PostgreSQL URI connection failed to authenticate, ${err}`)
    }
}

export const DeliberationORM = sequelize.define(
    "deliberations", /* table name: 'deliberations', object name: 'DeliberationORM */
    {
        username: {
            type: DataTypes.STRING, 
        }, 
        unique_id: {
            type: DataTypes.UUID, 
            allowNull: false, 
            primaryKey: true
        }, 
        organization: { 
            type: DataTypes.STRING
        },
        state: { 
            type: DataTypes.STRING
        },
        policy_topic: { 
            type: DataTypes.STRING
        },
        ideology: { 
            type: DataTypes.STRING
        },
        lawmaker_name: { 
            type: DataTypes.STRING
        },
        discussion_history: { 
            type: DataTypes.JSON, 
            allowNull: true
        },
    }, {
        sequelize, 
        modelName: "deliberations",
        tableName: "deliberations"
    } as ModelOptions,
);


sequelize.sync(); 



