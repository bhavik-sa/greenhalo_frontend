import { Component } from '@angular/core';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { Footer } from '../footer/footer';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, Sidebar, Header, Footer],
  templateUrl: './layout.html',
  styleUrls: ['./layout.css'],
  standalone: true
})
export class Layout {

}
