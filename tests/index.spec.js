'use strict';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoosePaginate = require('../index');

const mongod = new MongoMemoryServer();

const MONGO_URI = 'mongodb://127.0.0.1/mongoose_paginate_test';

const AuthorSchema = new mongoose.Schema({ name: String });
const Author = mongoose.model('Author', AuthorSchema);

const BookSchema = new mongoose.Schema({
  title: String,
  date: Date,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'Author',
  },
});

BookSchema.plugin(mongoosePaginate);

const Book = mongoose.model('Book', BookSchema);

describe('mongoose-paginate', function() {
  beforeAll(async () => {
    const uri = await mongod.getConnectionString();
    const mongooseOpts = {
      useNewUrlParser: true,
      useFindAndModify: false,
      useCreateIndex: true,
      useUnifiedTopology: true,
    };

    await mongoose.connect(uri, mongooseOpts);
    await mongoose.connection.db.dropDatabase();

    let book,
      books = [];
    let date = new Date();
    const author = await Author.create({ name: 'Arthur Conan Doyle' });

    for (let i = 1; i <= 100; i++) {
      book = new Book({
        title: 'Book #' + i,
        date: new Date(date.getTime() + i),
        author: author._id,
      });
      books.push(book);
    }
    await Book.create(books);
  });

  afterEach(function() {
    delete mongoosePaginate.paginate.options;
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongod.stop();
  });

  it('returns promise', function() {
    let promise = Book.paginate();
    expect(promise.then).toBeInstanceOf(Function);
  });

  it('calls callback', function(done) {
    Book.paginate({}, {}, function(err, result) {
      expect(err).toBeNull();
      expect(result).toBeInstanceOf(Object);
      done();
    });
  });

  describe('paginates', function() {
    it('with criteria', function() {
      return Book.paginate({ title: 'Book #10' }).then(result => {
        expect(result.docs).toHaveLength(1);
        expect(result.docs[0].title).toEqual('Book #10');
      });
    });
    it('with default options (page=1, limit=10, lean=false)', function() {
      return Book.paginate().then(function(result) {
        expect(result.docs).toHaveLength(10);
        expect(result.docs[0]).toBeInstanceOf(mongoose.Document);
        expect(result.total).toEqual(100);
        expect(result.limit).toEqual(10);
        expect(result.page).toEqual(1);
        expect(result.pages).toEqual(10);
        expect(result.offset).toEqual(0);
      });
    });
    it('with custom default options', function() {
      mongoosePaginate.paginate.options = {
        limit: 20,
        lean: true,
      };
      return Book.paginate().then(function(result) {
        expect(result.docs).toHaveLength(20);
        expect(result.limit).toEqual(20);
        expect(result.docs[0]).not.toBeInstanceOf(mongoose.Document);
      });
    });
    it('with offset and limit', function() {
      return Book.paginate({}, { offset: 30, limit: 20 }).then(function(
        result,
      ) {
        expect(result.docs).toHaveLength(20);
        expect(result.total).toEqual(100);
        expect(result.limit).toEqual(20);
        expect(result.offset).toEqual(30);
        expect(result).not.toHaveProperty('page');
        expect(result).not.toHaveProperty('pages');
      });
    });
    it('with page and limit', function() {
      return Book.paginate({}, { page: 1, limit: 20 }).then(function(result) {
        expect(result.docs).toHaveLength(20);
        expect(result.total).toEqual(100);
        expect(result.limit).toEqual(20);
        expect(result.page).toEqual(1);
        expect(result.pages).toEqual(5);
        expect(result).not.toHaveProperty('offset');
      });
    });
    it('with zero limit', function() {
      return Book.paginate({}, { page: 1, limit: 0 }).then(function(result) {
        expect(result.docs).toHaveLength(0);
        expect(result.total).toEqual(100);
        expect(result.limit).toEqual(0);
        expect(result.page).toEqual(1);
        expect(result.pages).toEqual(Infinity);
      });
    });
    it('with select', function() {
      return Book.paginate({}, { select: 'title' }).then(function(result) {
        expect(result.docs[0].title).toBeDefined();
        expect(result.docs[0].date).not.toBeDefined();
      });
    });
    it('with sort', function() {
      return Book.paginate({}, { sort: { date: -1 } }).then(function(result) {
        expect(result.docs[0].title).toEqual('Book #100');
      });
    });
    it('with populate', function() {
      return Book.paginate({}, { populate: 'author' }).then(function(result) {
        expect(result.docs[0].author.name).toEqual('Arthur Conan Doyle');
      });
    });
    describe('with lean', function() {
      it('with default leanWithId=true', function() {
        return Book.paginate({}, { lean: true }).then(function(result) {
          expect(result.docs[0]).not.toBeInstanceOf(mongoose.Document);
          expect(result.docs[0].id).toEqual(String(result.docs[0]._id));
        });
      });

      it('with leanWithId=false', function() {
        return Book.paginate({}, { lean: true, leanWithId: false }).then(
          function(result) {
            expect(result.docs[0]).not.toBeInstanceOf(mongoose.Document);
            expect(result.docs[0]).not.toHaveProperty('id');
          },
        );
      });
    });
  });
});
