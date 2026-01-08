
import { Sequelize, Model, DataTypes } from "sequelize";
import { Deliberation } from "../models/+deliberations"; 
import type { ModelOptions } from "sequelize"; 
import { type Memory } from "../models/+deliberations";
import { DB_USER, DB_HOST, DB_NAME, DB_PASS } from "$env/static/private";
import pg from "pg"; 
import type { Options } from '@sveltejs/vite-plugin-svelte';

export const sequelize = new Sequelize(`postgresql://${DB_USER}:${DB_PASS}@${DB_HOST}/${DB_NAME}`, 
    {
        dialect: "postgres", 
        dialectModule: pg,
        logging: true,
        dialectOptions: {
            ssl: {
                require: true,           // Enforce SSL
                rejectUnauthorized: false // Ignore self-signed certificates
            }
    } 
});


(async () => {
    try {
        await sequelize.authenticate();
        await sequelize.sync({alter: true});
        console.log('PostgreSQL connected and tables synced');
    } catch (err) {
        console.error('PostgreSQL connection failed:', err);
    }
})();


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
        degree_of_support: {
            type: DataTypes.FLOAT, 
            allowNull: true
        },
        persona: {
            type: DataTypes.TEXT, 
            allowNull: true
        },
        memory: { 
            type: DataTypes.JSON, 
            allowNull: true
        },
        conversation_turn: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        guardrail_tripwire: {
            type: DataTypes.BOOLEAN,
            allowNull: true 
        }
    }, {
        sequelize, 
        modelName: "deliberations",
        tableName: "deliberations"
    } as ModelOptions,
);

export async function validateAndRetrieveDeliberation( uuid:any ) { 
    const deliberationObject = await sequelize.models.deliberations.findByPk(uuid)
    if (deliberationObject == null || deliberationObject == undefined){
        console.error("No deliberation instance found.")
        return null;
    }
    return deliberationObject;
}

export async function updateDeliberationRecord ( record: Model, d: Deliberation, savedMemory:Array<Memory> ) { 
    try {
        return record.update({
            memory: savedMemory,
            conversation_turn: d.conversation_turn
        }) 
    } catch(err) {
        console.error(`Failed to update deliberation record in PostgreSQL database. ${err}`)
    }
}
