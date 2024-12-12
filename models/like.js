import Model from './model.js';

export default class Like extends Model {
    constructor() {
        super(true /* secured Id */);

        this.addField('PostId', 'string');
        this.addField('UserId', 'string');
        this.addField('Name', 'string');
    }
}
