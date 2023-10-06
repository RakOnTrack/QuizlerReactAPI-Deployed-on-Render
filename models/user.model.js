module.exports = mongoose => {
    const userSchema = mongoose.model(
        "Users",
        new mongoose.Schema({
            userName: {
                type: String,
                unique: true
            },
            password: String,
        
        })
    );
    return userSchema;
}