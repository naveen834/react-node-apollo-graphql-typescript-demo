import {
  Arg,
  Field,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Ctx,
  UseMiddleware,
  Int,
} from 'type-graphql';
import { User } from './entity/User';
import { hash, compare } from 'bcryptjs';
import { MyContext } from './MyContext';
import { createAccessToken, createRefreshToken } from './auth';
import { isAuth } from './isAuthMiddleware';
import { sendRefreshToken } from './sendRefreshToken';
import { getConnection } from 'typeorm';

@ObjectType()
class LoginResponse {
  @Field()
  accessToken: string;
}
// can create graphql schema inside of it and as i create i am going to tell type-graphql to check graphql type and typescript types
@Resolver()
export class UserResolver {
  // inside Query we can tell what type it returns
  @Query(() => String)
  hello() {
    return 'hi!';
  }
  @Query(() => String)
  // middleware runs before our resolver reads header and set payload
  @UseMiddleware(isAuth)
  bye(@Ctx() { payload }: MyContext) {
    return `your user id is:${payload!.userId}`;
  }
  @Query(() => [User])
  users() {
    return User.find();
  }

  @Mutation(() => Boolean)
  async revokeRefreshTokenForUser(@Arg('userId', () => Int) userId: number) {
    await getConnection()
      .getRepository(User)
      .increment({ id: userId }, 'tokenVersion', 1);

    return true;
  }
  // graphql mutations are what we create when we want to update something,modify something
  // 'email' is what user will pass in,email is variable name

  @Mutation(() => LoginResponse)
  async login(
    @Arg('email', () => String) email: string,
    @Arg('password', () => String) password: string,
    @Ctx() { res }: MyContext
  ): Promise<LoginResponse> {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      throw new Error('invalid login');
    }

    const valid = await compare(password, user.password);

    if (!valid) {
      throw new Error('bad password');
    }

    // login successful
    sendRefreshToken(res, createRefreshToken(user));

    return {
      accessToken: createAccessToken(user),
    };
  }

  @Mutation(() => Boolean)
  async register(
    @Arg('email', () => String) email: string,
    @Arg('password', () => String) password: string
  ) {
    const hashedPassword = await hash(password, 12);

    try {
      await User.insert({
        email,
        password: hashedPassword,
      });
    } catch (err) {
      console.log(err);
      return false;
    }
    return true;
  }
}
