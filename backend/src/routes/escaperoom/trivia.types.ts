export interface ValidateTriviaDto {
  userId: string;
  answers: {
    questionId: string;
    answerId: string;
  }[];
}
