import * as _ from "lodash";
import {inspect} from "util";
import {Actor, IAction, IActorOutput, IActorTest} from "./Actor";
import {Bus, IActorReply} from "./Bus";

/**
 * A mediator can mediate an action over a bus of actors.
 *
 * It does the following:
 * 1. Accepts an action in {@link Mediator#mediate}.
 * 2. Sends the action to the bus to test its applicability on all actors.
 * 3. It _mediates_ over these test results.
 * 4. It selects the _best_ actor.
 * 5. The action is run by the _best_ actor, and the result if returned.
 *
 * The _mediates_ and _best_ parts are filled in by subclasses of this abstract Mediator class.
 *
 * @template A The type of actor to mediator over.
 * @template I The input type of an actor.
 * @template T The test type of an actor.
 * @template O The output type of an actor.
 */
export abstract class Mediator<A extends Actor<I, T, O>,
  I extends IAction, T extends IActorTest, O extends IActorOutput> implements IMediatorArgs<A, I, T, O> {

  public readonly name: string;
  public readonly bus: Bus<A, I, T, O>;

  /**
   * All enumerable properties from the `args` object are inherited to this mediator.
   *
   * @param {IMediatorArgs<A extends Actor<I, T, O>, I extends IAction, T extends IActorTest,
   * O extends IActorOutput>} args Arguments object
   * @param {string} args.name The name for this mediator.
   * @param {Bus<A extends Actor<I, T, O>, I extends IAction, T extends IActorTest, O extends IActorOutput>} args.bus
   *        The bus this mediator will mediate over.
   * @throws When required arguments are missing.
   */
  constructor(args: IMediatorArgs<A, I, T, O>) {
    _.assign(this, args);
    if (!this.name) {
      throw new Error('A valid "name" argument must be provided.');
    }
    if (!this.bus) {
      throw new Error('A valid "bus" argument must be provided to "' + this.name + '".');
    }
  }

  /**
   * Mediate for the given action.
   *
   * This will send test the action on all actors in the bus.
   * The action will be run on the actor that tests _best_,
   * of which the result will be returned.
   *
   * @param {I} action The action to mediate for.
   * @return {Promise<O extends IActorOutput>} A promise that resolves to the mediation result.
   */
  public async mediate(action: I): Promise<O> {
    // Test all actors in the bus
    const actors: IActorReply<A, I, T, O>[] = this.bus.publish(action);
    if (!actors.length) {
      throw new Error('No actors are able to reply to the message in the bus '
        + this.bus.name + ': ' + inspect(action));
    }

    // Mediate to one actor and run the action on it
    const actor: A = await this.mediateWith(action, actors);
    return actor.run(action);
  }

  /**
   * Mediate for the given action with the given actor test results for the action.
   *
   * One actor must be returned that provided the _best_ test result.
   * How '_best_' is interpreted, depends on the implementation of the Mediator.
   *
   * @param {I} action The action to mediate for.
   * @param {IActorReply<A extends Actor<I, T, O>, I extends IAction, T extends IActorTest,
   * O extends IActorOutput>[]} testResults The actor test results for the action.
   * @return {Promise<A extends Actor<I, T, O>>} A promise that resolves to the _best_ actor.
   */
  protected abstract async mediateWith(action: I, testResults: IActorReply<A, I, T, O>[]): Promise<A>;

}

export interface IMediatorArgs<A extends Actor<I, T, O>,
  I extends IAction, T extends IActorTest, O extends IActorOutput> {
  name: string;
  bus: Bus<A, I, T, O>;
}