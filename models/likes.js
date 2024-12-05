import Model from './model.js';

export default class Likes extends Model {
    constructor() {
        super(true /* secured Id */);

        this.addField('PostId', 'string');
        this.addField('UserId', 'string');

        this.setKey("Title");
    }
}
