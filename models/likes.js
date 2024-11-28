import Model from './model.js';

export default class Likes extends Model {
    constructor() {
        super(true /* secured Id */);

        this.addField('PostId', 'integer');
        this.addField('UserId', 'integer');

        this.setKey("Title");
    }
}