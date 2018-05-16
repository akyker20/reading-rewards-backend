import { BadRequestError } from 'restify-errors';
import { ILexileRange } from './models';
import { GenreInterestMap } from './data/users';
import { IBook } from './data/books';
import { IRequest } from './Extensions';
import { Next, Request, RequestHandler, Response } from 'restify';
import _ = require('lodash');
import { IBookReview } from './data/book_reviews';

export type PromiseHandler = (req: Request) => Promise<any>;


/**
 * Similar to unwrapVal, but this function wraps an async function which
 * returns a promise that is attached to the req.promise field which can
 * later be processed (resolved/rejected) in handlePromise middleware.
 * @param handler
 */
export function unwrapData(handler: PromiseHandler): RequestHandler {
  return (req: IRequest<any>, res: Response, next: Next) => {
    req.promise = handler(req);
    next();
  };
}

/**
 * Clients should not receive a joi error.
 * They should receive something simpler:
 * i.e. 'Invalid/missing field user_name'
 * @param fieldName
 */
export function genFieldErr(fieldName: string): Error {
  return new BadRequestError(`Invalid/missing field ${fieldName}`);
}

export function getLexileRange(measure: number): ILexileRange {
  return {
    min: measure - 100,
    max: measure + 50
  };
}

export function computeCurrentLexileMeasure(
  initialLexileMeasure: number,
  bookReviews: IBookReview[]
): number {

  // if user has less than 3 submitted quizzes with comprehension scores
  // just use the initial lexile measure
  if (bookReviews.length < 3) {
    return initialLexileMeasure;
  }

  const recentReviews = _.chain(bookReviews)
    .orderBy('date_submitted', 'desc')
    .slice(0, 3)
    .value();

  return _.reduce(recentReviews, (total, review) => {
    const adjustedLexileSignal = review.book_lexile_measure + 50 * (review.comprehension - 4);
    return total + adjustedLexileSignal;
  }, 0) / recentReviews.length;

}

export function computeMatchScore(
  genreInterests: GenreInterestMap,
  book: IBook
): number {
  
  // Map the book's genres to the user's interests in these genres.
  // Remember that interest is 1-4.
  const userInterestsInGenres = book.genres.map(genreId => {
    if (genreId in genreInterests) {
      return genreInterests[genreId];
    }
    return 3; // kinda like it.
  });

  // take the average of these interest levels.
  const interestFactor = _.mean(userInterestsInGenres);

  // Amazon Popularity ranges from 0-5
  // interestFactor ranges from 1 to 4.
  // Normalize by 20 (the max)
  return (book.amazon_popularity * interestFactor) / 20.0;

}