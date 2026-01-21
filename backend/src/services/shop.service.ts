import { Item, IItem } from '../models/Item.js';
import { Inventory } from '../models/Inventory.js';
import { Character } from '../models/Character.js';

export class ShopService {
    async getAllItems(): Promise<IItem[]> {
        return Item.find({ isActive: true }).sort({ price: 1 });
    }

    async getItemById(itemId: string): Promise<IItem | null> {
        return Item.findById(itemId);
    }

    async purchaseItem(characterId: string, itemId: string): Promise<{
        success: boolean;
        message: string;
        newGoldBalance?: number;
    }> {
        const character = await Character.findById(characterId);
        if (!character) {
            return { success: false, message: 'Character not found' };
        }

        const item = await Item.findById(itemId);
        if (!item) {
            return { success: false, message: 'Item not found' };
        }

        if (!item.isActive) {
            return { success: false, message: 'Item is no longer available' };
        }

        if (character.gold < item.price) {
            return {
                success: false,
                message: `Not enough gold. Need ${item.price} CQ, have ${character.gold} CQ`
            };
        }

        // Check if already owned (for non-consumables)
        if (item.type !== 'CONSUMABLE') {
            const existing = await Inventory.findOne({ characterId, itemId });
            if (existing) {
                return { success: false, message: 'You already own this item' };
            }
        }

        // Deduct gold
        character.gold -= item.price;
        await character.save();

        // Add to inventory or increment quantity
        const inventoryItem = await Inventory.findOne({ characterId, itemId });
        if (inventoryItem) {
            inventoryItem.quantity += 1;
            await inventoryItem.save();
        } else {
            await Inventory.create({
                characterId,
                itemId,
                quantity: 1,
            });
        }

        return {
            success: true,
            message: `Purchased ${item.name}!`,
            newGoldBalance: character.gold,
        };
    }

    async equipItem(characterId: string, itemId: string): Promise<boolean> {
        const inventoryItem = await Inventory.findOne({ characterId, itemId });
        if (!inventoryItem) return false;

        const item = await Item.findById(itemId);
        if (!item || item.type === 'CONSUMABLE') return false;

        // Unequip other items of same type
        const itemsOfType = await Inventory.find({ characterId }).populate('itemId');
        for (const invItem of itemsOfType) {
            const populatedItem = invItem.itemId as unknown as IItem;
            if (populatedItem && populatedItem.type === item.type && invItem.isEquipped) {
                invItem.isEquipped = false;
                await invItem.save();
            }
        }

        inventoryItem.isEquipped = true;
        await inventoryItem.save();
        return true;
    }

    async unequipItem(characterId: string, itemId: string): Promise<boolean> {
        const inventoryItem = await Inventory.findOne({ characterId, itemId });
        if (!inventoryItem) return false;

        inventoryItem.isEquipped = false;
        await inventoryItem.save();
        return true;
    }
}

export const shopService = new ShopService();
